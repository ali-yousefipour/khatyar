import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { C, FONT } from '../theme';
import { currentVersion, checkForUpdate } from '../updater';

const SECTIONS = [
  {
    title: 'شروع کار با خطیار',
    icon: '🚕',
    items: [
      ['ورود به سامانه', 'با نام کاربری و رمز عبور سازمانی وارد شوید. در صورت اجبار به تغییر رمز یا تکمیل اطلاعات اولیه، مراحل نمایش‌داده‌شده را انجام دهید.'],
      ['داشبورد', 'پس از ورود، داشبورد بر اساس نقش و دسترسی شما نمایش داده می‌شود و مسیر دسترسی به بخش‌های عملیاتی را فراهم می‌کند.'],
      ['منوی برنامه', 'با دکمه منوی ☰ می‌توانید به بخش‌های مجاز، پیام‌ها، گزارش‌ها، تنظیمات، راهنما، سیاست حریم خصوصی و درباره برنامه دسترسی داشته باشید.'],
    ],
  },
  {
    title: 'حضور و غیاب',
    icon: '🕘',
    items: [
      ['ثبت حضور', 'از بخش «ثبت حضور من» برای ثبت ورود و خروج موردنیاز شیفت استفاده کنید. اطلاعات ثبت‌شده پس از برقراری ارتباط با سامانه همگام می‌شود.'],
      ['گزارش حضور', 'کاربران دارای دسترسی می‌توانند سوابق و گزارش‌های حضور را مشاهده و بررسی کنند.'],
      ['عملیات شیفت', 'برای استفاده صحیح از قابلیت‌های مرتبط با شیفت، برنامه را در طول زمان کاری مطابق دستورالعمل سازمانی در دسترس نگه دارید.'],
    ],
  },
  {
    title: 'بی‌سیم خطیار',
    icon: '📻',
    items: [
      ['ارتباط بی‌سیم', 'از بخش «بی‌سیم خطیار» برای ارتباط صوتی در کانال‌های مجاز استفاده کنید.'],
      ['ارسال صدا', 'برای صحبت، دکمه ارسال صدا را نگه دارید و پس از پایان صحبت رها کنید. افکت‌های فشردن و رهاکردن دکمه بخشی از تجربه صوتی بی‌سیم است.'],
      ['پخش در پس‌زمینه', 'در صورت فعال بودن قابلیت مربوطه، پخش صدای بی‌سیم می‌تواند هنگام جابه‌جایی بین بخش‌های برنامه ادامه داشته باشد.'],
    ],
  },
  {
    title: 'کارکرد آفلاین و همگام‌سازی',
    icon: '☁️',
    items: [
      ['صف ارسال آفلاین', 'اگر اینترنت موقتاً قطع شود، برخی عملیات قابل‌صف در دستگاه نگهداری می‌شوند تا پس از برقراری ارتباط برای سامانه ارسال شوند.'],
      ['ارسال خودکار', 'صف اطلاعات به‌صورت خودکار برای ارسال مجدد تلاش می‌کند و از ارسال تکراری اطلاعاتی که دارای شناسه یکتا هستند جلوگیری می‌شود.'],
      ['نکته مهم', 'پس از انجام عملیات حساس، در اولین فرصت از اتصال اینترنت و موفقیت همگام‌سازی مطمئن شوید.'],
    ],
  },
  {
    title: 'مدیریت خودرو و موتورسیکلت',
    icon: '🚗',
    items: [
      ['اطلاعات خودرو', 'در صورت داشتن دسترسی، مشخصات خودرو یا موتورسیکلت از بخش مربوطه قابل مشاهده و ویرایش است.'],
      ['تصاویر', 'تصاویر موردنیاز عملیات را از طریق دوربین یا انتخاب فایل ثبت و ارسال کنید. قبل از ارسال، از واضح و کامل بودن تصویر مطمئن شوید.'],
      ['چک‌لیست', 'کاربران مجاز می‌توانند چک‌لیست‌های خودرویی و موتوری را تکمیل و سوابق مربوط را مشاهده کنند.'],
    ],
  },
  {
    title: 'مدیریت رانندگان و خطوط',
    icon: '🧑‍✈️',
    items: [
      ['جستجو', 'برای یافتن راننده یا تاکسی، از جستجوی سامانه و اطلاعات موجود در اختیار نقش خود استفاده کنید.'],
      ['اطلاعات راننده', 'سوابق و اطلاعاتی که سطح دسترسی شما اجازه می‌دهد در صفحه راننده نمایش داده می‌شود.'],
      ['خط و بازدید', 'بخش‌های مربوط به بازدید خطوط، ثبت اطلاعات خط، مأموریت روزانه و ایستگاه‌ها برای کاربران دارای دسترسی در دسترس هستند.'],
    ],
  },
  {
    title: 'پیامک، پیام‌ها و گزارش‌ها',
    icon: '💬',
    items: [
      ['پیامک', 'ارسال پیامک به رانندگان و مشاهده پیامک‌های مرتبط، بر اساس سطح دسترسی انجام می‌شود. سهمیه و وضعیت ارسال نیز در بخش‌های مربوط نمایش داده می‌شود.'],
      ['پیام‌ها', 'پیام‌های سامانه و اعلان‌های دریافتی را از بخش پیام‌ها و اعلان‌ها بررسی کنید.'],
      ['گزارش‌ها', 'برای ثبت گزارش، تذکر یا بررسی گزارش‌های دریافتی از بخش مربوط استفاده کنید. در صورت امکان، اطلاعات و تصویر لازم را کامل ارسال کنید.'],
    ],
  },
  {
    title: 'اعلان‌ها و اعتبار مدارک',
    icon: '🔔',
    items: [
      ['اعلان‌ها', 'اعلان‌های جدید سامانه در بخش اعلان‌ها نمایش داده می‌شوند و تعداد موارد خوانده‌نشده در منوی برنامه مشخص می‌شود.'],
      ['اعتبار مدارک', 'کاربران دارای دسترسی می‌توانند وضعیت اعتبار مواردی مانند بیمه، معاینه و مجوزهای عملیاتی را در بخش‌های مربوط بررسی کنند.'],
      ['تنظیمات اعلان', 'تنظیمات اعلان‌های مرتبط با اعتبار و هشدارهای میدانی از بخش تنظیمات قابل مدیریت است.'],
    ],
  },
  {
    title: 'قفل و امنیت برنامه',
    icon: '🔐',
    items: [
      ['قفل برنامه', 'در بخش «قفل برنامه» می‌توانید روش امنیتی موردنظر را از گزینه‌های موجود انتخاب کنید.'],
      ['روش‌های ورود', 'خطیار از PIN، رمز عددی، رمز حروفی، الگوی ۳×۳ و در دستگاه‌های سازگار از احراز هویت زیستی پشتیبانی می‌کند.'],
      ['قفل خودکار', 'زمان قفل خودکار را مطابق نیاز خود تنظیم کنید تا پس از مدت مشخصی از عدم فعالیت، برنامه دوباره درخواست احراز هویت کند.'],
      ['امنیت', 'اطلاعات حساس مربوط به قفل برنامه به‌صورت امن روی دستگاه نگهداری می‌شود. اطلاعات خام احراز هویت زیستی در اختیار خطیار قرار نمی‌گیرد.'],
    ],
  },
  {
    title: 'تنظیمات برنامه',
    icon: '⚙️',
    items: [
      ['تنظیمات', 'از بخش «تنظیمات» به گزینه‌های قابل تنظیم برنامه، از جمله نقشه، اعلان‌ها، هشدارها و قفل برنامه دسترسی دارید.'],
      ['نقشه', 'تنظیمات مربوط به نمایش و عملکرد نقشه را از بخش «تنظیمات نقشه» مدیریت کنید.'],
      ['به‌روزرسانی', 'در صورت ارائه نسخه جدید، از مسیر اعلام‌شده داخل برنامه برای بررسی و دریافت به‌روزرسانی استفاده کنید.'],
    ],
  },
  {
    title: 'سیاست حریم خصوصی و درباره برنامه',
    icon: 'ℹ️',
    items: [
      ['سیاست حریم خصوصی', 'در این صفحه درباره نوع اطلاعات مورد استفاده برنامه، هدف استفاده، نحوه ارسال و نگهداری اطلاعات و روش درخواست اصلاح یا حذف اطلاعات توضیح داده شده است.'],
      ['درباره برنامه', 'اطلاعات نام برنامه، نسخه، تولیدکننده، شرکت، وب‌سایت و راه ارتباط با پشتیبانی در این بخش قرار دارد.'],
      ['پشتیبانی', 'برای پشتیبانی خطیار با شماره ۰۹۹۸۲۱۱۸۸۹۹ تماس بگیرید یا به وب‌سایت www.mobinshot.ir مراجعه کنید.'],
    ],
  },
];

function Section({ section, open, onPress }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.sectionHeader} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.sectionIcon}><Text style={styles.sectionIconText}>{section.icon}</Text></View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.sectionBody}>
          {section.items.map(([title, text]) => (
            <View key={title} style={styles.item}>
              <Text style={styles.itemTitle}>{title}</Text>
              <Text style={styles.itemText}>{text}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const version = currentVersion();

  const doCheckUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try { await checkForUpdate(true); } catch (_) {}
    setChecking(false);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.brand}>خطیار</Text>
        <Text style={styles.heroTitle}>راهنمای استفاده از برنامه</Text>
        <Text style={styles.heroText}>راهنمای امکانات، عملیات و تنظیمات سامانه مدیریت و نظارت بر ناوگان تاکسیرانی</Text>
        <View style={styles.versionBadge}><Text style={styles.versionText}>نسخه {version}</Text></View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>راهنمای سریع</Text>
        <Text style={styles.noticeText}>بخش‌های زیر را باز کنید تا نحوه استفاده از امکانات اصلی خطیار را ببینید. بعضی گزینه‌ها فقط برای نقش‌ها و کاربران دارای دسترسی نمایش داده می‌شوند.</Text>
      </View>

      {SECTIONS.map((section, index) => (
        <Section
          key={section.title}
          section={section}
          open={openIndex === index}
          onPress={() => setOpenIndex(openIndex === index ? -1 : index)}
        />
      ))}

      <TouchableOpacity style={styles.updateButton} onPress={doCheckUpdate} disabled={checking} activeOpacity={0.82}>
        <Text style={styles.updateButtonText}>{checking ? 'در حال بررسی نسخه جدید…' : 'بررسی نسخه جدید'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.supportButton} onPress={() => Linking.openURL('tel:09982118899')} activeOpacity={0.82}>
        <Text style={styles.supportButtonText}>تماس با پشتیبانی: ۰۹۹۸۲۱۱۸۸۹۹</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>خطیار — سامانه مدیریت و نظارت بر ناوگان تاکسیرانی</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 36 },
  hero: { backgroundColor: C.brand, borderRadius: 20, padding: 20, marginBottom: 12, alignItems: 'flex-end' },
  brand: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 27, textAlign: 'right', writingDirection: 'rtl' },
  heroTitle: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 17, lineHeight: 27, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  heroText: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 12, lineHeight: 21, marginTop: 7, textAlign: 'right', writingDirection: 'rtl' },
  versionBadge: { alignSelf: 'flex-start', marginTop: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  versionText: { color: '#fff', fontFamily: FONT.bold, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  notice: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, marginBottom: 10 },
  noticeTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  noticeText: { color: C.muted, fontFamily: FONT.regular, fontSize: 12, lineHeight: 21, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, marginBottom: 9, overflow: 'hidden' },
  sectionHeader: { minHeight: 62, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center' },
  sectionIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  sectionIconText: { fontSize: 19, textAlign: 'center' },
  sectionTitle: { flex: 1, color: C.ink, fontFamily: FONT.bold, fontSize: 13, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl' },
  chevron: { width: 25, color: C.muted, fontSize: 18, textAlign: 'center' },
  sectionBody: { borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 15, paddingBottom: 7 },
  item: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  itemTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  itemText: { color: C.muted, fontFamily: FONT.regular, fontSize: 12, lineHeight: 21, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  updateButton: { backgroundColor: C.brand, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  updateButtonText: { color: '#fff', fontFamily: FONT.bold, fontSize: 13, textAlign: 'center', writingDirection: 'rtl' },
  supportButton: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  supportButtonText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'center', writingDirection: 'rtl' },
  footer: { color: C.muted, fontFamily: FONT.regular, fontSize: 10, textAlign: 'center', marginTop: 17, writingDirection: 'rtl' },
});
