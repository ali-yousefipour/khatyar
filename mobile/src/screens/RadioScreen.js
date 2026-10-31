import React, { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, ScrollView, Modal, NativeModules, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRadio } from '../radio/RadioContext';
import { C, FONT } from '../theme';
import { faNum } from '../num';

const CHANNEL_AUDIO = [
  require('../../assets/sounds/ch1.mp3'),
  require('../../assets/sounds/ch2.mp3'),
  require('../../assets/sounds/ch3.mp3'),
  require('../../assets/sounds/ch4.mp3'),
  require('../../assets/sounds/ch5.mp3'),
];

const messageTime = value => {
  if (!value) return '—';
  const raw = String(value).replace('T', ' ');
  const match = raw.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  return faNum(match ? `${match[1]} · ${match[2]}` : raw);
};

const recentOnly = rows => {
  const map = new Map();
  for (const item of (Array.isArray(rows) ? rows : [])) {
    if (item?.id == null || !item.created_at) continue;
    const date = new Date(String(item.created_at).replace(' ', 'T')).getTime();
    if (Number.isFinite(date) && Date.now() - date < 86400000 && Date.now() >= date - 300000) {
      map.set(String(item.id), item);
    }
  }
  return [...map.values()].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)).slice(0, 3);
};

function SettingToggle({ label, checked, onPress, icon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!checked }}
      onPress={onPress}
      style={[s.setting, checked && s.settingOn]}
    >
      <MaterialCommunityIcons name={icon} size={21} color={checked ? C.brand : '#64748b'} />
      <Text style={s.settingText} numberOfLines={2}>{label}</Text>
      <MaterialCommunityIcons name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={checked ? C.brand : '#94a3b8'} />
    </TouchableOpacity>
  );
}

export default function RadioScreen() {
  const {
    enabled, channels, channelId, busy: ctxBusy, speaker: ctxSpeaker, recording, status,
    lastMessage, recentMessages, maxTalkMs, minTalkMs, loading, loadError, setEnabled,
    setChannel, startTalk, stopTalk, reloadChannels, playRecentMessage, playingMessageId,
    listenAll, listenAllAllowed, setListenAll, volumePttEnabled, setVolumePttEnabled,
  } = useRadio();
  // Keep one preloaded player per announcement. Replacing a source immediately before
  // play() used to race the asynchronous decoder (most visibly for channel 5).
  const p1 = useAudioPlayer(CHANNEL_AUDIO[0]);
  const p2 = useAudioPlayer(CHANNEL_AUDIO[1]);
  const p3 = useAudioPlayer(CHANNEL_AUDIO[2]);
  const p4 = useAudioPlayer(CHANNEL_AUDIO[3]);
  const p5 = useAudioPlayer(CHANNEL_AUDIO[4]);
  const players = [p1, p2, p3, p4, p5];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [stableRecent, setStableRecent] = useState([]);
  const [playbackLockUntil, setPlaybackLockUntil] = useState(0);
  const announcementSerial = useRef(0);
  const { width } = useWindowDimensions();
  const selected = channels.find(c => Number(c.id) === Number(channelId));
  const busy = recording ? false : !!ctxBusy;
  const playbackBusy = !!playingMessageId || playbackLockUntil > Date.now();
  const pttDisabled = !enabled || !channelId || playbackBusy;
  const changingDisabled = recording || loading || busy || playbackBusy;
  const nativeRadio = NativeModules?.KhatyarRadio;
  const maxSeconds = Math.max(1, Math.round((maxTalkMs || 25000) / 1000));
  const minSeconds = Math.max(1, Math.ceil((minTalkMs || 1500) / 1000));
  const currentSpeaker = lastMessage?.sender_name || lastMessage?.first_name || lastMessage?.family || '';
  const currentRole = lastMessage?.role_title || lastMessage?.sender_role || '';
  const currentChannel = lastMessage?.channel_name || lastMessage?.channel_title ||
    channels.find(c => Number(c.id) === Number(lastMessage?.channel_id))?.name ||
    selected?.name || `کانال ${faNum(channelId || 0)}`;

  useEffect(() => {
    setStableRecent(recentOnly(recentMessages));
  }, [channelId, recentMessages]);

  useEffect(() => {
    if (!lastMessage?.id || !lastMessage?.duration_ms) {
      if (lastMessage?.id) setPlaybackLockUntil(0);
      return;
    }
    const ms = Math.max(1200, Number(lastMessage.duration_ms) + 850);
    setPlaybackLockUntil(Date.now() + ms);
    const timer = setTimeout(() => setPlaybackLockUntil(0), ms);
    return () => clearTimeout(timer);
  }, [lastMessage?.id, lastMessage?.duration_ms]);

  const announceChannel = async id => {
    const player = players[Number(id) - 1];
    if (!player) return;
    const serial = ++announcementSerial.current;
    try {
      // seekTo is asynchronous. Never replace the already-loaded asset or play
      // until seeking has finished; this also prevents double/truncated prompts.
      await player.seekTo(0);
      if (serial === announcementSerial.current) await player.play();
    } catch (error) {
      // Channel selection remains usable even when the audio device is unavailable.
    }
  };

  const chooseChannel = id => {
    setPickerOpen(false);
    if (Number(id) === Number(channelId)) return;
    setChannel(id);
    void announceChannel(id);
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={[s.content, { paddingHorizontal: width >= 700 ? 32 : 16 }]} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.heading}>بی‌سیم خطیار</Text>
          <Text style={s.headerSub}>{enabled ? 'آماده دریافت پیام‌های کانال' : 'برای دریافت و ارسال، بی‌سیم را روشن کنید'}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="switch"
          accessibilityLabel="روشن یا خاموش کردن بی‌سیم"
          accessibilityState={{ checked: !!enabled }}
          onPress={() => setEnabled(!enabled)}
          style={[s.power, enabled && s.powerOn]}
        >
          <MaterialCommunityIcons name="power" size={22} color={enabled ? C.brand : '#fff'} />
          <Text style={[s.powerText, enabled && s.powerTextOn]}>{enabled ? 'روشن' : 'خاموش'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.sectionTitle}>کانال ارتباطی</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="بروزرسانی کانال‌ها" disabled={loading} onPress={reloadChannels} style={s.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={18} color={C.brand} />
            <Text style={s.refreshText}>{loading ? 'دریافت…' : 'بروزرسانی'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`انتخاب کانال؛ کانال فعلی ${selected?.name || 'انتخاب نشده'}`}
          accessibilityState={{ disabled: changingDisabled, expanded: pickerOpen }}
          disabled={changingDisabled}
          activeOpacity={0.75}
          onPress={() => setPickerOpen(true)}
          style={[s.selector, changingDisabled && s.faded]}
        >
          <MaterialCommunityIcons name="access-point" size={27} color={C.brand} />
          <View style={s.selectorText}>
            <Text style={s.caption}>کانال فعال</Text>
            <Text style={s.selected} numberOfLines={2}>{selected?.name || (channelId ? `کانال ${faNum(channelId)}` : 'یک کانال انتخاب کنید')}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={25} color={C.brand} />
        </TouchableOpacity>
        {!!loadError && <Text style={s.error} accessibilityRole="alert">{loadError}</Text>}
        {!!nativeRadio?.openBatteryOptimizationSettings && (
          <TouchableOpacity accessibilityRole="button" onPress={() => nativeRadio.openBatteryOptimizationSettings().catch(() => {})} style={s.battery}>
            <MaterialCommunityIcons name="battery-check-outline" size={20} color={C.brand} />
            <Text style={s.batteryText}>تنظیم دریافت پیام هنگام خاموش بودن صفحه</Text>
            <MaterialCommunityIcons name="chevron-left" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.settingRow, width < 360 && s.settingColumn]}>
        <SettingToggle label="دکمه فیزیکی PTT" icon="cellphone-sound" checked={volumePttEnabled} onPress={() => setVolumePttEnabled(!volumePttEnabled)} />
        {listenAllAllowed && <SettingToggle label="شنود همه کانال‌ها" icon="headphones" checked={listenAll} onPress={() => setListenAll(!listenAll)} />}
      </View>

      {playbackBusy && !!lastMessage?.id && (
        <View style={s.playingCard}>
          <View style={s.row}>
            <Text style={s.playingTitle}>در حال پخش پیام دریافتی</Text>
            <MaterialCommunityIcons name="volume-high" size={23} color={C.brand} />
          </View>
          <Text style={s.playingInfo}>کانال: {currentChannel}</Text>
          {!!currentSpeaker && <Text style={s.playingInfo}>گوینده: {currentSpeaker}</Text>}
          {!!currentRole && <Text style={s.playingInfo}>سمت: {currentRole}</Text>}
        </View>
      )}

      <View style={s.statusCard}>
        <View style={[s.statusDot, { backgroundColor: busy ? '#dc2626' : '#16a34a' }]} />
        <View style={s.statusDetails}>
          <Text style={s.caption}>وضعیت کانال</Text>
          <Text style={s.statusText}>{busy ? (ctxSpeaker?.name || 'کاربر در حال صحبت است') : 'کانال آزاد است'}</Text>
          {!!busy && !!ctxSpeaker?.role && <Text style={s.caption}>سمت: {ctxSpeaker.role}</Text>}
        </View>
        <MaterialCommunityIcons name={busy ? 'account-voice' : 'signal'} size={25} color={busy ? '#dc2626' : C.brand} />
      </View>

      <View style={s.talkCard}>
        <Text style={s.talkTitle}>{recording ? 'در حال ارسال صدا' : playbackBusy ? 'در حال پخش پیام' : busy ? 'کانال مشغول است؛ برای تلاش مجدد نگه دارید' : 'برای صحبت، دکمه را نگه دارید'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="نگه داشتن برای صحبت در بی‌سیم"
          accessibilityHint="با رها کردن دکمه، ارسال صدا متوقف می‌شود"
          accessibilityState={{ disabled: pttDisabled }}
          disabled={pttDisabled}
          onPressIn={startTalk}
          onPressOut={stopTalk}
          style={({ pressed }) => [s.talkButton, recording && s.talkActive, pttDisabled && s.faded, pressed && !pttDisabled && s.talkPressed]}
        >
          <MaterialCommunityIcons name={recording ? 'microphone' : 'microphone-outline'} size={48} color="#fff" />
          <Text style={s.talkText}>{recording ? 'در حال صحبت' : playbackBusy ? 'لطفاً صبر کنید' : 'فشار دهید و نگه دارید'}</Text>
        </Pressable>
        <Text style={s.limit}>مدت پیام: حداقل {faNum(minSeconds)} و حداکثر {faNum(maxSeconds)} ثانیه</Text>
        {!!status && <Text style={s.statusMessage}>{status}</Text>}
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.sectionTitle}>پیام‌های اخیر</Text>
          <MaterialCommunityIcons name="history" size={23} color={C.brand} />
        </View>
        <Text style={s.helper}>سه پیام آخر این کانال در ۲۴ ساعت گذشته</Text>
        {stableRecent.length ? stableRecent.map(message => (
          <View key={message.id} style={s.messageRow}>
            <View style={s.messageDetails}>
              <Text style={s.sender} numberOfLines={2}>{String(message.sender_name || [message.first_name, message.last_name, message.family].filter(Boolean).join(' ') || 'کاربر').trim()}</Text>
              {!!(message.role_title || message.sender_role) && <Text style={s.messageRole}>{message.role_title || message.sender_role}</Text>}
              <Text style={s.time}>{messageTime(message.created_at)}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`پخش پیام ${message.sender_name || 'کاربر'}`}
              accessibilityState={{ disabled: playbackBusy }}
              disabled={playbackBusy}
              onPress={() => playRecentMessage(message)}
              style={[s.playButton, playbackBusy && s.faded]}
            >
              <MaterialCommunityIcons name="play" size={22} color={C.brand} />
              <Text style={s.playText}>پخش</Text>
            </TouchableOpacity>
          </View>
        )) : <Text style={s.empty}>در ۲۴ ساعت گذشته پیامی ثبت نشده است.</Text>}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)} statusBarTranslucent>
        <View style={s.modalOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="بستن فهرست کانال‌ها" style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={s.row}>
              <Text style={s.sheetTitle}>انتخاب کانال بی‌سیم</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="بستن" onPress={() => setPickerOpen(false)} style={s.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>
            <Text style={s.helper}>برای تغییر کانال، روی نام آن بزنید.</Text>
            <ScrollView style={s.channelList} nestedScrollEnabled contentContainerStyle={s.channelListContent}>
              {channels.length ? channels.map(channel => {
                const active = Number(channel.id) === Number(channelId);
                return (
                  <TouchableOpacity
                    key={channel.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={channel.name || `کانال ${faNum(channel.id)}`}
                    activeOpacity={0.8}
                    style={[s.channelRow, active && s.activeChannel]}
                    onPress={() => chooseChannel(channel.id)}
                  >
                    <MaterialCommunityIcons name={active ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={active ? C.brand : '#94a3b8'} />
                    <Text style={[s.channelName, active && s.channelNameActive]} numberOfLines={2}>{channel.name || `کانال ${faNum(channel.id)}`}</Text>
                    {!!channel.busy && <Text style={s.channelBusy}>مشغول</Text>}
                    {active && <Text style={s.activeBadge}>فعال</Text>}
                  </TouchableOpacity>
                );
              }) : <Text style={s.empty}>کانالی در دسترس نیست. فهرست را بروزرسانی کنید.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  content: { paddingTop: 16, paddingBottom: 48, alignSelf: 'center', width: '100%', maxWidth: 760 },
  header: { backgroundColor: C.brand, borderRadius: 24, padding: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  heading: { fontFamily: FONT.bold, color: '#fff', fontSize: 21, textAlign: 'right', writingDirection: 'rtl' },
  headerSub: { fontFamily: FONT.regular, color: '#e0f2e9', fontSize: 12, lineHeight: 20, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  power: { minWidth: 72, minHeight: 68, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 8 },
  powerOn: { backgroundColor: '#fff' },
  powerText: { color: '#fff', fontFamily: FONT.bold, fontSize: 12 },
  powerTextOn: { color: C.brand },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 12, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  refreshButton: { minHeight: 48, flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  refreshText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  selector: { minHeight: 76, borderWidth: 1.5, borderColor: '#bfdbd0', backgroundColor: '#f3faf7', borderRadius: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  selectorText: { flex: 1, minWidth: 0 },
  caption: { fontFamily: FONT.regular, fontSize: 12, color: '#64748b', textAlign: 'right', writingDirection: 'rtl' },
  selected: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  error: { fontFamily: FONT.regular, color: '#b42318', textAlign: 'right', writingDirection: 'rtl', marginTop: 10, lineHeight: 21 },
  battery: { marginTop: 12, minHeight: 48, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  batteryText: { color: C.brand, fontFamily: FONT.regular, fontSize: 12, flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  settingRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  settingColumn: { flexDirection: 'column' },
  setting: { flex: 1, minHeight: 64, flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line },
  settingOn: { borderColor: '#b4dccc', backgroundColor: '#f3faf7' },
  settingText: { flex: 1, minWidth: 0, fontFamily: FONT.bold, color: C.ink, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  playingCard: { marginTop: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#b4dccc', backgroundColor: '#e8f6f0' },
  playingTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  playingInfo: { color: C.ink, fontFamily: FONT.regular, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginTop: 6 },
  statusCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDetails: { flex: 1, minWidth: 0 },
  statusText: { fontFamily: FONT.bold, color: C.ink, fontSize: 16, textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  talkCard: { marginTop: 12, backgroundColor: '#142637', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' },
  talkTitle: { color: '#fff', fontFamily: FONT.bold, fontSize: 15, lineHeight: 25, textAlign: 'center', writingDirection: 'rtl', marginBottom: 18 },
  talkButton: { width: 168, height: 168, borderRadius: 84, backgroundColor: C.brand, borderWidth: 6, borderColor: '#7ab7a5', alignItems: 'center', justifyContent: 'center', padding: 12, elevation: 6 },
  talkActive: { backgroundColor: '#b42318', borderColor: '#f9a8a8' },
  talkPressed: { opacity: 0.85 },
  talkText: { color: '#fff', fontFamily: FONT.bold, fontSize: 12, lineHeight: 20, textAlign: 'center', writingDirection: 'rtl', marginTop: 8 },
  faded: { opacity: 0.45 },
  limit: { fontFamily: FONT.regular, color: '#e2e8f0', fontSize: 12, lineHeight: 20, marginTop: 16, textAlign: 'center', writingDirection: 'rtl' },
  statusMessage: { fontFamily: FONT.bold, color: '#fff', fontSize: 12, lineHeight: 21, marginTop: 10, textAlign: 'center', writingDirection: 'rtl' },
  helper: { fontFamily: FONT.regular, fontSize: 12, color: '#64748b', textAlign: 'right', writingDirection: 'rtl', lineHeight: 21, marginTop: 4, marginBottom: 8 },
  messageRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 76, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.line },
  messageDetails: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  sender: { color: C.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  messageRole: { color: '#64748b', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  time: { color: C.brand, fontFamily: FONT.regular, fontSize: 11, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  playButton: { minHeight: 48, minWidth: 78, borderRadius: 12, backgroundColor: '#e8f6f0', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 8 },
  playText: { fontFamily: FONT.bold, fontSize: 12, color: C.brand },
  empty: { fontFamily: FONT.regular, fontSize: 13, textAlign: 'center', writingDirection: 'rtl', color: '#64748b', paddingVertical: 22 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 20, paddingBottom: 28, maxHeight: '78%' },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontFamily: FONT.bold, fontSize: 18, color: C.ink, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  closeButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#f1f5f9' },
  channelList: { flexGrow: 0 },
  channelListContent: { paddingBottom: 12 },
  channelRow: { minHeight: 60, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  activeChannel: { borderColor: C.brand, backgroundColor: '#e8f6f0' },
  channelName: { flex: 1, minWidth: 0, fontFamily: FONT.bold, fontSize: 14, color: C.ink, textAlign: 'right', writingDirection: 'rtl' },
  channelNameActive: { color: C.brand },
  channelBusy: { fontFamily: FONT.regular, color: '#b42318', fontSize: 11 },
  activeBadge: { fontFamily: FONT.bold, color: C.brand, fontSize: 11 },
});
