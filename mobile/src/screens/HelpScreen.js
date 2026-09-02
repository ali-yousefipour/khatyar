import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { C, FONT } from '../theme';
import { currentVersion, checkForUpdate } from '../updater';

// Keep the help content inside this ASCII-named JS module. Do not load a
// separate Persian-named asset/file at runtime; this avoids filename/packaging
// issues on Android and keeps the release bundle deterministic.
const SECTIONS = [
  {
    title: 'شروع کار',
    items: [
      'پس از ورود، داشبورد بر اساس نقش و سطح دسترسی شما نمایش داده می‌شود.',
      'در اولین اجرا، اجازه‌های موردنیاز مانند موقعیت مکانی، دوربین و اعلان‌ها را طبق درخواست برنامه فعال کنید.',
      'اگر برنامه از شما خواست تنظیمات امنیتی یا دسترسی‌ها را اصلاح کنید، مراحل نمایش‌داده‌شده را کامل کرده و دوباره بررسی کنید.',
    ],
  },
  {
    title: 'داشبورد و منوی دسترسی سریع',
    items: [
      'کارت‌های آماری، تعداد رانندگان، خودروها، حضور امروز و چک‌لیست‌های ماه را نمایش می‌دهند.',
      'دسترسی سریع بر اساس دسته‌های عمومی، عملیات میدانی، اداری، ارتباطات و شخصی قابل فیلتر است.',
      'گزینه بی‌سیم از همین بخش مستقیماً وارد صفحه بی‌سیم می‌شود و کانال انتخاب‌شده را در ماژول ارتباط رادیویی استفاده می‌کند.',
      'همگام‌سازی، داده‌های محلی صف‌شده را پس از برقراری ارتباط ارسال و اطلاعات داشبورد را تازه می‌کند.',
    ],
  },
  {
    title: 'بی‌سیم',
    items: [
      'در صفحه بی‌سیم ابتدا کانال مجاز خود را انتخاب کنید؛ کانال انتخاب‌شده برای دریافت و ارسال پیام صوتی استفاده می‌شود.',
      'برای صحبت، دکمه نگه‌داشتن برای صحبت را لمس و تا پایان پیام نگه دارید؛ پس از رها کردن، پیام ارسال می‌شود.',
      'قفل کانال از ارسال هم‌زمان چند پیام جلوگیری می‌کند و وضعیت گوینده در صفحه نمایش داده می‌شود.',
      'در صورت نبود کانال یا خطای ارتباطی، اتصال اینترنت و وضعیت کانال‌های اختصاص‌یافته به حساب کاربری را بررسی کنید.',
    ],
  },
  {
    title: 'عملیات میدانی',
    items: [
      'ثبت حضور من برای ثبت حضور روزانه استفاده می‌شود.',
      'حاضرین در خط، وضعیت افراد حاضر در خطوط را نمایش می‌دهد.',
      'مأموریت روزانه و برنامه بازدید و پوشش خط برای پیگیری عملیات میدانی، موقعیت مکانی و گزارش فعالیت استفاده می‌شوند.',
      'ثبت موقعیت و تصویر خطوط برای ثبت دقیق محل ایستگاه، تابلوهای ایستگاه و تصاویر محل استفاده می‌شود.',
      'ایستگاه‌های ثبت‌شده من سوابق ایستگاه‌های ثبت‌شده شما را نمایش می‌دهد و امکان ورود به جریان ویرایش را فراهم می‌کند.',
    ],
  },
  {
    title: 'ثبت موقعیت و تصاویر ایستگاه',
    items: [
      'در مرحله موقعیت، GPS دقیق را دریافت کنید یا در صورت نیاز موقعیت را روی نقشه به‌صورت دستی تعیین و تأیید کنید.',
      'در مرحله خط، خطوط نزدیک پیشنهاد می‌شوند و امکان جستجوی خط نیز وجود دارد. شناسه داخلی خط برای کاربر نمایش داده نمی‌شود.',
      'در مرحله تابلوها، نوع تابلو را انتخاب و تصویر واضح هر تابلو را با دوربین ثبت و قبل از ادامه تأیید کنید.',
      'در مرحله تصویر ایستگاه، تصویر محل ایستگاه را ثبت کنید و سپس آدرس کامل را بررسی کنید.',
      'در مرحله پایانی همه اطلاعات، موقعیت، خط، تابلوها، تصاویر و آدرس را بازبینی و سپس ذخیره کنید.',
      'برای ویرایش، از «ایستگاه‌های ثبت‌شده من» وارد ایستگاه موردنظر شوید و اطلاعات آن را اصلاح کنید.',
    ],
  },
  {
    title: 'گزارش، درخواست و ارتباطات',
    items: [
      'ارسال گزارش برای ثبت گزارش‌های کاری و میدانی استفاده می‌شود.',
      'درخواست‌ها و تأیید درخواست‌ها برای ثبت و بررسی گردش درخواست‌ها هستند.',
      'ارسال برای شرکت برای ارسال موارد مربوط به شرکت سرویس‌دهنده استفاده می‌شود.',
      'پیامک، پیام‌ها، اعلان‌ها و ربات‌ها ابزارهای ارتباطی سامانه هستند و سطح دسترسی کاربر تعیین می‌کند کدام گزینه‌ها نمایش داده شوند.',
    ],
  },
  {
    title: 'حساب کاربری',
    items: [
      'حساب کاربری برای مشاهده و ویرایش اطلاعات شخصی، تغییر رمز و تنظیمات مرتبط با حساب استفاده می‌شود.',
      'فیش‌های حقوقی و کارکرد من از بخش‌های شخصی قابل دسترسی هستند.',
      'تنظیمات نقشه، اعلان‌ها و قفل برنامه از بخش تنظیمات حساب در دسترس هستند.',
    ],
  },
  {
    title: 'امضای پرسنلی',
    items: [
      'داخل کادر امضا با انگشت امضای خود را رسم کنید.',
      'برای ثبت راحت‌تر می‌توانید از حالت تمام‌صفحه استفاده کنید.',
      'پس از ثبت، امضا در فرم ذخیره می‌شود؛ برای ثبت امضای جدید ابتدا گزینه پاک کردن را بزنید.',
    ],
  },
  {
    title: 'آفلاین و امنیت',
    items: [
      'برخی عملیات در زمان قطع اینترنت در صف محلی قرار می‌گیرند و پس از برقراری اتصال ارسال می‌شوند.',
      'برنامه ممکن است برای ادامه فعالیت نیازمند فعال بودن موقعیت مکانی، دوربین یا تنظیمات مرتبط با اجرای پس‌زمینه باشد.',
      'در صورت مشاهده خطای شبکه، ابتدا اتصال اینترنت را بررسی و سپس همگام‌سازی را اجرا کنید.',
    ],
  },
];

export default function HelpScreen({ navigation }) {
  const [checking, setChecking] = useState(false);
  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Text style={s.brand}>خطیار</Text>
        <Text style={s.title}>راهنمای کامل استفاده از نرم‌افزار</Text>
        <Text style={s.sub}>راهنمای امکانات، عملیات میدانی، بی‌سیم و ثبت ایستگاه‌ها</Text>
      </View>

      {SECTIONS.map(section => (
        <View key={section.title} style={s.card}>
          <Text style={s.section}>{section.title}</Text>
          {section.items.map((item, index) => (
            <View key={`${section.title}-${index}`} style={s.item}>
              <Text style={s.dot}>•</Text>
              <Text style={s.text}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={s.about}>
        <Text style={s.aboutTitle}>اطلاعات برنامه</Text>
        <Text style={s.aboutText}>نام برنامه: خطیار</Text>
        <Text style={s.aboutText}>نسخهٔ نصب‌شده: {currentVersion()}</Text>
        <Text style={s.aboutText}>توسعه‌دهنده: علی یوسفی‌پور</Text>
        <Text style={s.aboutText}>شرکت: مبین شات</Text>
        <TouchableOpacity
          style={s.updateBtn}
          disabled={checking}
          onPress={async () => { setChecking(true); try { await checkForUpdate(true); } finally { setChecking(false); } }}
        >
          <Text style={s.updateBtnText}>{checking ? 'در حال بررسی…' : 'بررسی بروزرسانی برنامه'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={s.backText}>بازگشت</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 40 },
  hero: { backgroundColor: C.brand, borderRadius: 20, padding: 20, marginBottom: 12 },
  brand: { color: '#fff', fontFamily: FONT.bold, fontSize: 24, textAlign: 'right' },
  title: { color: '#fff', fontFamily: FONT.bold, fontSize: 17, textAlign: 'right', marginTop: 8 },
  sub: { color: '#d7eee8', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#e4e9f2', padding: 14, marginBottom: 10 },
  section: { color: C.brand, fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', marginBottom: 8 },
  item: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 9, paddingVertical: 7 },
  dot: { color: C.brand, fontSize: 20, lineHeight: 20 },
  text: { flex: 1, color: '#344054', fontFamily: FONT.regular, fontSize: 12.5, lineHeight: 22, textAlign: 'right' },
  about: { backgroundColor: '#102033', borderRadius: 15, padding: 16 },
  aboutTitle: { color: '#fff', fontFamily: FONT.bold, fontSize: 15, textAlign: 'right', marginBottom: 7 },
  aboutText: { color: '#d7dee9', fontFamily: FONT.regular, fontSize: 12, textAlign: 'right', lineHeight: 23 },
  updateBtn: { backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  updateBtnText: { color: '#fff', fontFamily: FONT.bold, fontSize: 13 },
  back: { backgroundColor: C.brand, borderRadius: 13, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  backText: { color: '#fff', fontFamily: FONT.bold, fontSize: 14 },
});
