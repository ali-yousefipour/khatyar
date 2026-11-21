import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import ModalKeyboardView from './ModalKeyboardView';
import { C, FONT } from '../theme';

export default function ReportTextModal({
  visible, title, value, onChangeText, placeholder='متن را وارد کنید…',
  confirmText='ثبت', onClose, onConfirm, busy=false,
}) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={busy ? () => {} : onClose}>
      <ModalKeyboardView style={s.backdrop}>
        <View style={s.card}>
          <ScrollView
            style={s.content}
            contentContainerStyle={s.contentInner}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text allowFontScaling accessibilityRole="header" style={s.title}>{title}</Text>
            <TextInput
              allowFontScaling
              accessibilityLabel={title || placeholder}
              style={s.input}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={C.muted}
              multiline
              textAlign="right"
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
          <View style={s.row}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="انصراف"
              accessibilityState={{ disabled:busy }}
              style={s.cancel}
              onPress={onClose}
              disabled={busy}
            >
              <Text allowFontScaling style={s.cancelTxt}>انصراف</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={confirmText}
              accessibilityState={{ disabled:busy, busy }}
              style={[s.confirm, busy && { opacity:.6 }]}
              onPress={onConfirm}
              disabled={busy}
            >
              <Text allowFontScaling style={s.confirmTxt}>{busy ? 'در حال ثبت…' : confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ModalKeyboardView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.48)',alignItems:'center',justifyContent:'center',padding:18},
  card:{width:'100%',maxWidth:520,maxHeight:'90%',backgroundColor:C.paper,borderRadius:18,padding:16},
  content:{flexShrink:1,flexGrow:0},
  contentInner:{paddingBottom:2},
  title:{fontFamily:FONT.bold,fontSize:18,color:C.ink,textAlign:'right',marginBottom:10},
  input:{backgroundColor:'#fff',borderWidth:1,borderColor:C.line,borderRadius:12,padding:12,minHeight:150,fontFamily:FONT.regular,color:C.ink},
  row:{flexDirection:'row-reverse',gap:9,marginTop:12},
  cancel:{flex:1,minHeight:48,backgroundColor:'#eef1f7',borderRadius:12,paddingVertical:11,paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
  cancelTxt:{fontFamily:FONT.bold,color:C.ink,textAlign:'center'},
  confirm:{flex:1,minHeight:48,backgroundColor:C.brand,borderRadius:12,paddingVertical:11,paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
  confirmTxt:{fontFamily:FONT.bold,color:'#fff',textAlign:'center'},
});
