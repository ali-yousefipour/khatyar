import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { C, FONT } from '../theme';
import { currentVersion, checkForUpdate } from '../updater';

const SECTIONS = [
  {
    title: 'شروع کار با خطیار',
    icon: '🚕',
    items: [
      ['ورود و راه‌اندازی اولیه', 'با نام کاربری و رمز عبور سازمانی وارد شوید. اگر سامانه تغییر رمز، تکمیل اطلاعات یا تمدید دوره‌ای را الزامی کند، تا پایان مراحل نمایش‌داده‌شده ادامه دهید.'],
      ['داشبورد', 'داشبورد بر اساس نقش و دسترسی شما ساخته می‌شود و آیتم‌های عملیاتی مجاز را نمایش می‌دهد. ممکن است امکانات یک کاربر با کاربر دیگر متفاوت باشد.'],
      ['منوی برنامه', 'با دکمه ☰ به منوی برنامه دسترسی دارید. در این منو پیام‌ها، اعلان‌ها، کارکرد، حساب کاربری، تنظیمات، راهنما و سایر بخش‌هایی که برای سمت شما فعال شده‌اند نمایش داده می‌شوند.'],
      ['دسترسی‌ها', 'نمایش آیتم‌ها و امکان اجرای عملیات به مجوزهای حساب کاربری وابسته است. اگر گزینه‌ای را نمی‌بینید، فعال نبودن آن برای سمت شما لزوماً به معنی خطای برنامه نیست.'],
    ],
  },
  {
    title: 'ثبت حضور و مدیریت شیفت',
    icon: '🕘',
    items: [
      ['الزام موقعیت مکانی', 'قابلیت‌های حضور و عملیات میدانی بر پایه موقعیت مکانی کاربر کار می‌کنند. GPS دستگاه را روشن نگه دارید و مجوز دسترسی به موقعیت مکانی را برای خطیار فعال کنید.'],
      ['ثبت حضور', 'در «ثبت حضور من» ابتدا موقعیت فعلی دستگاه بررسی می‌شود. فقط خطوط و محدوده‌های جغرافیایی مجاز برای حساب شما مبنای اعتبارسنجی حضور هستند.'],
      ['چند خط مجاز', 'اگر برای حساب شما چند خط مجاز تعریف شده باشد، ثبت حضور می‌تواند در هر یک از خطوط مجاز انجام شود؛ خروج نیز می‌تواند در هر خط مجاز دیگری که موقعیت فعلی شما در محدوده آن قرار دارد انجام شود.'],
      ['ثبت خروج', 'برای خروج، موقعیت فعلی دوباره بررسی می‌شود و اطلاعات خط خروج جداگانه قابل ثبت است. بنابراین خط ورود و خط خروج الزاماً یکسان نیستند.'],
      ['گزارش حضور', 'سوابق حضور و اطلاعات خط ورود/خروج، در صورت داشتن دسترسی، از بخش گزارش حضور قابل مشاهده و بررسی است.'],
    ],
  },
  {
    title: 'بی‌سیم خطیار',
    icon: '📻',
    items: [
      ['کانال‌های بی‌سیم', 'از «بی‌سیم خطیار» برای ارتباط صوتی در کانال‌هایی که برای حساب شما مجاز شده‌اند استفاده کنید.'],
      ['PTT یا فشردن برای صحبت', 'برای ارسال صدا دکمه صحبت را نگه دارید و پس از پایان مکالمه رها کنید. وضعیت ارسال و دریافت صدا را از رابط بی‌سیم دنبال کنید.'],
      ['صدای بی‌سیم', 'افکت‌های فشردن و رهاکردن، نویز و سایر پردازش‌های صوتی بخشی از سیستم بی‌سیم هستند و برای تجربه عملیاتی بی‌سیم در نظر گرفته شده‌اند.'],
      ['پس‌زمینه', 'در صورت فعال بودن سرویس مربوطه، دریافت صدای بی‌سیم می‌تواند هنگام جابه‌جایی بین بخش‌های برنامه ادامه داشته باشد. برای جلوگیری از قطع ارتباط، مجوزهای لازم دستگاه را مسدود نکنید.'],
    ],
  },
  {
    title: 'سرویس مدارس و بازدید خودرو',
    icon: '🏫',
    items: [
      ['دسترسی به سرویس مدارس', 'در صورت فعال بودن مجوز، «سرویس مدارس» از منوی برنامه در دسترس است و اطلاعات و عملیات آن بر اساس سطح دسترسی حساب نمایش داده می‌شود.'],
      ['ویزارد مرحله‌ای بازدید', 'ثبت بازدید سرویس مدارس به‌صورت مرحله‌ای انجام می‌شود: ۱) اطلاعات مدرسه، ۲) مشخصات خودرو، ۳) راننده و تخلف، ۴) مکان و تصویر، ۵) بررسی و ثبت.'],
      ['مدرسه و شرکت', 'در مراحل مربوط می‌توانید مدرسه و شرکت سرویس را از اطلاعات ثبت‌شده سامانه انتخاب کنید. برخی کاربران فقط امکان مشاهده اطلاعات را دارند و عملیات مدیریتی برای کاربران مجاز فعال است.'],
      ['خودرو و راننده', 'اطلاعات پلاک، نوع و رنگ خودرو، جنسیت راننده، وضعیت مدارک و موارد تخلف در بخش‌های مربوط ثبت می‌شود. اطلاعات را قبل از ثبت نهایی کنترل کنید.'],
      ['مکان و تصویر', 'در مرحله مکان و تصویر، موقعیت بازدید و در صورت نیاز تصویر خودرو ثبت می‌شود. GPS باید فعال باشد و تصویر باید واضح و قابل استناد باشد.'],
      ['ثبت نهایی', 'پیش از ثبت، خلاصه اطلاعات همه مراحل را بررسی کنید. پس از ثبت موفق، نتیجه عملیات را از پیام سامانه بررسی کنید.'],
    ],
  },
  {
    title: 'خودرو، موتورسیکلت و چک‌لیست',
    icon: '🚗',
    items: [
      ['اطلاعات خودرو یا موتورسیکلت', 'کاربران دارای دسترسی می‌توانند اطلاعات وسیله سازمانی تخصیص‌یافته را مشاهده یا ویرایش کنند. عنوان و گزینه‌های این بخش بر اساس نوع وسیله تغییر می‌کند.'],
      ['چک‌لیست خودرویی و موتوری', 'در صورت فعال بودن مجوز، چک‌لیست مربوط به خودرو یا موتورسیکلت را تکمیل کنید و قبل از ثبت، همه موارد را کنترل کنید.'],
      ['تصویر و مستندات', 'هرجا سامانه تصویر یا مستندات می‌خواهد، تصویر خوانا و کامل ثبت کنید و از ارسال تصویر ناقص یا مبهم خودداری کنید.'],
      ['اعتبار مدارک', 'وضعیت مواردی مانند بیمه، معاینه و بهره‌برداری، برای کاربران دارای دسترسی از بخش‌های اعتبار قابل بررسی است.'],
    ],
  },
  {
    title: 'مدیریت رانندگان و خطوط',
    icon: '🧑‍✈️',
    items: [
      ['جستجوی تاکسی و تاکسیران', 'از جستجو برای یافتن اطلاعات راننده یا تاکسی در محدوده دسترسی خود استفاده کنید.'],
      ['اطلاعات راننده', 'جزئیات و سوابق راننده بر اساس سطح دسترسی حساب نمایش داده می‌شود.'],
      ['خطوط و محدوده‌های مجاز', 'برخی عملیات میدانی مانند حضور، بازدید و ثبت موقعیت به خطوط و محدوده‌های جغرافیایی تعریف‌شده برای کاربر وابسته‌اند.'],
      ['بازدید و موقعیت خط', 'بخش‌های برنامه بازدید خط، مأموریت روزانه، ثبت موقعیت و تصویر خط و ایستگاه‌های ثبت‌شده را برای کاربران مجاز فراهم می‌کنند.'],
      ['رانندگان موقت و گزارش‌ها', 'در صورت داشتن مجوز، اطلاعات رانندگان موقت، فعالیت رانندگان هر خط و گزارش زیرمجموعه‌ها قابل مشاهده است.'],
    ],
  },
  {
    title: 'گزارش‌ها، تذکرات و کارتابل',
    icon: '📋',
    items: [
      ['ارسال گزارش', 'برای ثبت گزارش یا تذکر، اطلاعات خواسته‌شده را کامل کنید و در صورت نیاز تصویر یا مستندات مرتبط را اضافه کنید.'],
      ['گزارشات دریافتی', 'در کارتابل گزارشات دریافتی، موارد ارجاع‌شده به شما را بررسی و در صورت وجود امکان پاسخ یا اقدام، از همان بخش پیگیری کنید.'],
      ['تذکرات و چک‌لیست‌های قبلی', 'کاربران مجاز می‌توانند سوابق تذکرات و چک‌لیست‌های ثبت‌شده را مشاهده کنند.'],
      ['کارکرد و فیش حقوقی', 'در «کارکرد من» و «فیش‌های حقوقی من» اطلاعاتی که از سمت سامانه برای حساب شما منتشر شده است نمایش داده می‌شود.'],
    ],
  },
  {
    title: 'پیام‌ها، اعلان‌ها و پیامک',
    icon: '💬',
    items: [
      ['پیام‌ها', 'پیام‌های سامانه را از بخش «پیام‌ها» مشاهده کنید. تعداد پیام‌های خوانده‌نشده در منوی برنامه می‌تواند به‌صورت نشان عددی نمایش داده شود.'],
      ['اعلان‌ها', 'اعلان‌های جدید و هشدارهای سامانه را از بخش «اعلان‌ها» بررسی کنید. اعلان‌های خوانده‌نشده نیز با نشان عددی قابل تشخیص هستند.'],
      ['گزارشات دریافتی', 'گزارشات دریافتی در منوی برنامه مسیر جداگانه‌ای دارند و تعداد موارد خوانده‌نشده در صورت وجود نمایش داده می‌شود.'],
      ['پیامک', 'امکانات ارسال و مشاهده پیامک، از جمله پیامک‌های ارسالی من و پیامک‌های مرتبط با راننده، فقط برای کاربران دارای مجوز نمایش داده می‌شوند.'],
      ['ربات‌ها', 'در صورت فعال بودن دسترسی، پیام‌های رباتی و ارتباطات مربوط به ربات‌های سامانه از بخش مربوط قابل استفاده است.'],
    ],
  },
  {
    title: 'نقشه، GPS و عملیات میدانی',
    icon: '📍',
    items: [
      ['GPS', 'برای عملیات وابسته به موقعیت، GPS را روشن کنید و دسترسی Location را در تنظیمات Android به خطیار بدهید.'],
      ['موقعیت روی نقشه', 'برخی صفحات با استفاده از آخرین موقعیت معتبر دستگاه، جایگاه کاربر را روی نقشه نمایش می‌دهند و برای اعتبارسنجی عملیات از موقعیت فعلی استفاده می‌کنند.'],
      ['محدوده جغرافیایی', 'مجاز بودن عملیات میدانی بر اساس محدوده جغرافیایی تعریف‌شده برای خط یا مأموریت بررسی می‌شود؛ صرفاً روشن بودن GPS به معنی مجاز بودن عملیات نیست.'],
      ['تنظیمات نقشه', 'از «تنظیمات نقشه» گزینه‌های مرتبط با عملکرد و نمایش نقشه را مدیریت کنید.'],
    ],
  },
  {
    title: 'کارکرد آفلاین و همگام‌سازی',
    icon: '☁️',
    items: [
      ['قطع موقت اینترنت', 'در عملیات قابل صف، قطع موقت اینترنت می‌تواند باعث نگهداری درخواست در صف ارسال دستگاه شود.'],
      ['همگام‌سازی', 'پس از بازگشت اتصال، صف ارسال برای همگام‌سازی مجدد تلاش می‌کند. نتیجه موفق یا ناموفق عملیات را بررسی کنید.'],
      ['جلوگیری از ثبت تکراری', 'در عملیات دارای شناسه یکتا، سازوکار صف و همگام‌سازی برای جلوگیری از ارسال تکراری اطلاعات در نظر گرفته شده است.'],
      ['عملیات حساس', 'برای عملیات مهم، پس از برقراری اینترنت از موفقیت همگام‌سازی مطمئن شوید و در صورت مشاهده خطا، عملیات را بدون بررسی نتیجه چند بار تکرار نکنید.'],
    ],
  },
  {
    title: 'امنیت و قفل برنامه',
    icon: '🔐',
    items: [
      ['قفل برنامه', 'از «قفل برنامه» روش امنیتی موردنظر را از گزینه‌های موجود انتخاب کنید.'],
      ['روش‌های قفل', 'خطیار از PIN، رمز عددی، رمز حروفی، الگوی ۳×۳ و در دستگاه‌های سازگار از احراز هویت زیستی پشتیبانی می‌کند.'],
      ['قفل خودکار', 'زمان قفل خودکار را متناسب با نیاز کاری تنظیم کنید تا پس از عدم فعالیت، برنامه دوباره احراز هویت بخواهد.'],
      ['احراز هویت زیستی', 'اطلاعات خام اثر انگشت یا داده زیستی در اختیار خطیار قرار نمی‌گیرد و احراز هویت توسط سازوکار امن سیستم‌عامل انجام می‌شود.'],
      ['امنیت حساب', 'رمز عبور و کدهای امنیتی خود را در اختیار دیگران قرار ندهید و در دستگاه‌های عمومی یا مشترک، حساب را بدون قفل رها نکنید.'],
    ],
  },
  {
    title: 'تنظیمات و به‌روزرسانی',
    icon: '⚙️',
    items: [
      ['تنظیمات', 'از بخش «تنظیمات» به امکانات قابل تنظیم برنامه مانند نقشه، اعلان‌ها، هشدارهای میدانی و قفل برنامه دسترسی دارید.'],
      ['به‌روزرسانی برنامه', 'خطیار هنگام راه‌اندازی نسخه سامانه را بررسی می‌کند و در صورت ارائه نسخه جدید، فرآیند به‌روزرسانی را از مسیر مربوط اعلام می‌کند.'],
      ['بررسی دستی نسخه', 'با دکمه «بررسی نسخه جدید» در همین صفحه می‌توانید بررسی نسخه را به‌صورت دستی اجرا کنید.'],
      ['حالت تعمیر و اختلال', 'در صورت فعال شدن حالت تعمیر یا اختلال سامانه، ممکن است دسترسی به بعضی عملیات تا بازگشت سرویس محدود شود.'],
    ],
  },
  {
    title: 'حریم خصوصی، درباره برنامه و پشتیبانی',
    icon: 'ℹ️',
    items: [
      ['حریم خصوصی', 'جزئیات نوع اطلاعات مورد استفاده، هدف پردازش، ارسال و نگهداری داده‌ها و حقوق مرتبط را از بخش «سیاست حریم خصوصی» مطالعه کنید.'],
      ['درباره برنامه', 'اطلاعات نام برنامه، نسخه، سازنده و اطلاعات انتشار در بخش «درباره برنامه» قرار دارد.'],
      ['پشتیبانی', 'برای مسائل فنی یا عملیاتی، ابتدا پیام خطا و نتیجه عملیات را ثبت کنید و سپس از مسیر پشتیبانی اعلام‌شده در برنامه پیگیری کنید.'],
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
