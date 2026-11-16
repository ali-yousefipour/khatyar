import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking, TextInput, Alert } from 'react-native';
import { C, FONT } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { currentVersion, checkForUpdate } from '../updater';
import DetailPageHeader from '../components/DetailPageHeader';

const SECTIONS = [
  {
    title: 'شروع کار با خطیار',
    icon: 'view-dashboard-outline',
    items: [
      ['ورود و راه‌اندازی اولیه', 'با نام کاربری و رمز عبور سازمانی وارد شوید. اگر سامانه تغییر رمز، تکمیل اطلاعات یا تمدید دوره‌ای را الزامی کند، تا پایان مراحل نمایش‌داده‌شده ادامه دهید.'],
      ['داشبورد', 'داشبورد بر اساس نقش و دسترسی شما ساخته می‌شود و فقط امکانات مجاز نقش شما را نمایش می‌دهد. بخش بالای صفحه شامل میانبرهای پیام‌ها، قفل، بی‌سیم، اعلان‌ها، به‌روزرسانی کش و گزارشات است؛ بعضی میانبرها ممکن است برای شما غیرفعال باشند.'],
      ['میانبرهای بالای داشبورد', 'روی آیکون هر میانبر بزنید تا همان بخش باز شود. نشان کوچک عددی روی پیام‌ها، گزارشات یا اعلان‌ها بیانگر موارد خوانده‌نشده است. «به‌روزرسانی کش» تازه‌سازی داده‌های ذخیره‌شده را آغاز می‌کند؛ نتیجه همگام‌سازی را در پیام سامانه دنبال کنید.'],
      ['کارت مشخصات و درجه', 'نام، سمت، منطقه و در صورت ثبت در سامانه درجه شما کنار تصویر نمایه نشان داده می‌شوند. تاریخ شمسی و آب‌وهوای مشهد زیر مشخصات قرار دارند؛ آب‌وهوا به اتصال و دریافت موفق اطلاعات وابسته است. برای اصلاح درجه یا سمت نادرست با مدیر سامانه تماس بگیرید.'],
      ['آمار فعالیت من', 'برای بازکردن کارت‌های آماری، سربرگ «آمار فعالیت من» را لمس کنید. کارت‌ها به‌صورت پیش‌فرض بسته هستند و با لمس مجدد بسته می‌شوند. تعدادها بر اساس داده‌های مجاز حساب کاربری نمایش داده می‌شوند.'],
      ['ابزارهای من و ترتیب نمایش', 'برای یافتن یک ابزار، نام آن را در کادر جستجو وارد کنید. گزینه «همه» فهرست کامل مجاز را نشان می‌دهد و «موارد دلخواه» فقط موارد انتخاب‌شده را. با «تنظیم ترتیب» چینش ابزارهای موردنیاز خود را تغییر دهید؛ ترتیب و دلخواه‌ها برای همان حساب نگهداری می‌شوند.'],
      ['منوی برنامه', 'با دکمه ☰ به منوی برنامه دسترسی دارید. در این منو پیام‌ها، اعلان‌ها، کارکرد، حساب کاربری، تنظیمات، راهنما و سایر بخش‌هایی که برای سمت شما فعال شده‌اند نمایش داده می‌شوند.'],
      ['دسترسی‌ها', 'نمایش آیتم‌ها و امکان اجرای عملیات به مجوزهای حساب کاربری وابسته است. اگر گزینه‌ای را نمی‌بینید، فعال نبودن آن برای سمت شما لزوماً به معنی خطای برنامه نیست.'],
    ],
  },
  {
    title: 'ثبت حضور و مدیریت شیفت',
    icon: 'clock-check-outline',
    items: [
      ['الزام موقعیت مکانی', 'قابلیت‌های حضور و عملیات میدانی بر پایه موقعیت مکانی کاربر کار می‌کنند. GPS دستگاه را روشن نگه دارید و مجوز دسترسی به موقعیت مکانی را برای خطیار فعال کنید.'],
      ['ثبت حضور', 'در «ثبت حضور من» ابتدا موقعیت فعلی دستگاه بررسی می‌شود. فقط خطوط و محدوده‌های جغرافیایی مجاز برای حساب شما مبنای اعتبارسنجی حضور هستند.'],
      ['چند خط مجاز', 'اگر برای حساب شما چند خط مجاز تعریف شده باشد، ثبت حضور می‌تواند در هر یک از خطوط مجاز انجام شود؛ خروج نیز می‌تواند در هر خط مجاز دیگری که موقعیت فعلی شما در محدوده آن قرار دارد انجام شود.'],
      ['ثبت خروج', 'برای خروج، موقعیت فعلی دوباره بررسی می‌شود و اطلاعات خط خروج جداگانه قابل ثبت است. بنابراین خط ورود و خط خروج الزاماً یکسان نیستند.'],
      ['گزارش حضور', 'سوابق حضور و اطلاعات خط ورود/خروج، در صورت داشتن دسترسی، از بخش گزارش حضور قابل مشاهده و بررسی است.'],
      ['صحت‌سنجی حضور', 'در صورت درخواست صحت‌سنجی توسط برنامه، دوربین و دسترسی‌های لازم را فعال کنید و تصویر واضح ثبت کنید. نتیجه را بررسی کنید؛ در صورت ضعف اینترنت، از تکرار بی‌دلیل چندباره ثبت خودداری کنید و وضعیت صف را کنترل کنید.'],
      ['تردد دستی و وضعیت درخواست', 'در صورت فعال بودن ثبت تردد دستی طبق سیاست کاری، درخواست ورود یا خروج را همراه با دلیل و تصویر موردنیاز ارسال کنید. ثبت درخواست با تأیید نهایی یکسان نیست؛ وضعیت آن را در فهرست درخواست‌ها بررسی کنید.'],
    ],
  },
  {
    title: 'بی‌سیم خطیار',
    icon: 'radio-handheld',
    items: [
      ['کانال‌های بی‌سیم', 'از «بی‌سیم خطیار» برای ارتباط صوتی در کانال‌هایی که برای حساب شما مجاز شده‌اند استفاده کنید.'],
      ['PTT یا فشردن برای صحبت', 'برای ارسال صدا دکمه صحبت را نگه دارید و پس از پایان مکالمه رها کنید. وضعیت ارسال و دریافت صدا را از رابط بی‌سیم دنبال کنید.'],
      ['صدای بی‌سیم', 'افکت‌های فشردن و رهاکردن، نویز و سایر پردازش‌های صوتی بخشی از سیستم بی‌سیم هستند و برای تجربه عملیاتی بی‌سیم در نظر گرفته شده‌اند.'],
      ['پس‌زمینه', 'در صورت فعال بودن سرویس مربوطه، دریافت صدای بی‌سیم می‌تواند هنگام جابه‌جایی بین بخش‌های برنامه ادامه داشته باشد. برای جلوگیری از قطع ارتباط، مجوزهای لازم دستگاه را مسدود نکنید.'],
    ],
  },
  {
    title: 'سرویس مدارس و بازدید خودرو',
    icon: 'school-outline',
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
    icon: 'car-outline',
    items: [
      ['اطلاعات خودرو یا موتورسیکلت', 'کاربران دارای دسترسی می‌توانند اطلاعات وسیله سازمانی تخصیص‌یافته را مشاهده یا ویرایش کنند. عنوان و گزینه‌های این بخش بر اساس نوع وسیله تغییر می‌کند.'],
      ['چک‌لیست خودرویی و موتوری', 'در صورت فعال بودن مجوز، چک‌لیست مربوط به خودرو یا موتورسیکلت را تکمیل کنید و قبل از ثبت، همه موارد را کنترل کنید.'],
      ['تصویر و مستندات', 'هرجا سامانه تصویر یا مستندات می‌خواهد، تصویر خوانا و کامل ثبت کنید و از ارسال تصویر ناقص یا مبهم خودداری کنید.'],
      ['اعتبار مدارک', 'وضعیت مواردی مانند بیمه، معاینه و بهره‌برداری، برای کاربران دارای دسترسی از بخش‌های اعتبار قابل بررسی است.'],
    ],
  },
  {
    title: 'مدیریت رانندگان و خطوط',
    icon: 'account-group-outline',
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
    icon: 'file-document-outline',
    items: [
      ['ارسال گزارش', 'در بخش «ارسال گزارش» موضوع را از فهرست کشویی انتخاب کنید؛ برای پیدا کردن سریع‌تر، بخشی از عنوان موضوع را تایپ کنید. سپس اولویت، متن گزارش و گیرنده را تعیین کنید. در صورت نیاز تا ۵ تصویر پیوست کنید؛ در فرم ارسال گزارش، امکان افزودن PDF وجود ندارد.'],
      ['انتخاب گیرنده و رونوشت', 'پس از انتخاب مقام بالادست یا یک شخص دیگر، نام گیرنده را پیش از ارسال کنترل کنید. گزینه رونوشت فقط یک نسخه برای اطلاع فرد دیگر ارسال می‌کند و مسئول اصلی رسیدگی را تغییر نمی‌دهد.'],
      ['فیلترهای پیشرفته گزارشات', 'در تب‌های «دریافتی»، «ارجاع‌های من»، «رونوشت‌های من» و «بایگانی» ابتدا عنوان «فیلترهای پیشرفته» بسته است. برای مشاهده بازه تاریخ، فرستنده، وضعیت، اولویت، مرتب‌سازی و گروه‌بندی آن را باز کنید؛ سپس «اعمال فیلترها» را بزنید. «پاک‌سازی فیلترها» انتخاب‌های فیلتر را به حالت اولیه برمی‌گرداند.'],
      ['جزئیات، پاسخ و ارجاع', 'با لمس یک گزارش، جزئیات، تصویر پیوست، نام مسئول جاری و تاریخچه گردش کار را ببینید. بسته به مجوز و وضعیت گزارش، می‌توانید یادداشت بنویسید، پاسخ ثبت کنید، آن را ارجاع دهید یا رونوشت ارسال کنید. پیش از رد یا حذف گزارش، توضیح و پیام تأیید را بخوانید.'],
      ['دریافت PDF گزارش', 'برای گرفتن نسخه رسمی گزارش ثبت‌شده، از گزینه «دریافت PDF گزارش با امضا و یادداشت‌ها» در صفحه جزئیات استفاده کنید. این خروجی با بارگذاری فایل PDF در فرم ارسال گزارش تفاوت دارد.'],
      ['گزارشات دریافتی', 'در کارتابل گزارشات دریافتی، موارد ارجاع‌شده به شما را بررسی و در صورت وجود امکان پاسخ یا اقدام، از همان بخش پیگیری کنید.'],
      ['تذکرات و چک‌لیست‌های قبلی', 'کاربران مجاز می‌توانند سوابق تذکرات و چک‌لیست‌های ثبت‌شده را مشاهده کنند.'],
      ['کارکرد و فیش حقوقی', 'در «کارکرد من» و «فیش‌های حقوقی من» اطلاعاتی که از سمت سامانه برای حساب شما منتشر شده است نمایش داده می‌شود.'],
    ],
  },
  {
    title: 'پیام‌ها، اعلان‌ها و پیامک',
    icon: 'message-text-outline',
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
    icon: 'map-marker-outline',
    items: [
      ['GPS', 'برای عملیات وابسته به موقعیت، GPS را روشن کنید و دسترسی Location را در تنظیمات Android به خطیار بدهید.'],
      ['موقعیت روی نقشه', 'برخی صفحات با استفاده از آخرین موقعیت معتبر دستگاه، جایگاه کاربر را روی نقشه نمایش می‌دهند و برای اعتبارسنجی عملیات از موقعیت فعلی استفاده می‌کنند.'],
      ['محدوده جغرافیایی', 'مجاز بودن عملیات میدانی بر اساس محدوده جغرافیایی تعریف‌شده برای خط یا مأموریت بررسی می‌شود؛ صرفاً روشن بودن GPS به معنی مجاز بودن عملیات نیست.'],
      ['تنظیمات نقشه', 'از «تنظیمات نقشه» گزینه‌های مرتبط با عملکرد و نمایش نقشه را مدیریت کنید.'],
    ],
  },
  {
    title: 'کارکرد آفلاین و همگام‌سازی',
    icon: 'cloud-sync-outline',
    items: [
      ['قطع موقت اینترنت', 'در عملیات قابل صف، قطع موقت اینترنت می‌تواند باعث نگهداری درخواست در صف ارسال دستگاه شود.'],
      ['همگام‌سازی', 'پس از بازگشت اتصال، صف ارسال برای همگام‌سازی مجدد تلاش می‌کند. نتیجه موفق یا ناموفق عملیات را بررسی کنید.'],
      ['به‌روزرسانی کش داشبورد', 'دکمه «به‌روزرسانی کش» در نوار میانبر داشبورد، تازه‌سازی داده‌های ذخیره‌شده را اجرا می‌کند. این دکمه پاک‌کردن حساب یا خروج از برنامه نیست. در هنگام همگام‌سازی مجدد، از ارسال تکراری درخواست خودداری کنید.'],
      ['جلوگیری از ثبت تکراری', 'در عملیات دارای شناسه یکتا، سازوکار صف و همگام‌سازی برای جلوگیری از ارسال تکراری اطلاعات در نظر گرفته شده است.'],
      ['عملیات حساس', 'برای عملیات مهم، پس از برقراری اینترنت از موفقیت همگام‌سازی مطمئن شوید و در صورت مشاهده خطا، عملیات را بدون بررسی نتیجه چند بار تکرار نکنید.'],
    ],
  },
  {
    title: 'امنیت و قفل برنامه',
    icon: 'lock-outline',
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
    icon: 'cog-outline',
    items: [
      ['تنظیمات', 'از بخش «تنظیمات» به امکانات قابل تنظیم برنامه مانند نقشه، اعلان‌ها، هشدارهای میدانی و قفل برنامه دسترسی دارید.'],
      ['به‌روزرسانی برنامه', 'خطیار هنگام راه‌اندازی نسخه سامانه را بررسی می‌کند و در صورت ارائه نسخه جدید، فرآیند به‌روزرسانی را از مسیر مربوط اعلام می‌کند.'],
      ['بررسی دستی نسخه', 'با دکمه «بررسی نسخه جدید» در همین صفحه می‌توانید بررسی نسخه را به‌صورت دستی اجرا کنید.'],
      ['حالت تعمیر و اختلال', 'در صورت فعال شدن حالت تعمیر یا اختلال سامانه، ممکن است دسترسی به بعضی عملیات تا بازگشت سرویس محدود شود.'],
    ],
  },
  {
    title: 'حریم خصوصی، درباره برنامه و پشتیبانی',
    icon: 'information-outline',
    items: [
      ['حریم خصوصی', 'جزئیات نوع اطلاعات مورد استفاده، هدف پردازش، ارسال و نگهداری داده‌ها و حقوق مرتبط را از بخش «سیاست حریم خصوصی» مطالعه کنید.'],
      ['درباره برنامه', 'اطلاعات نام برنامه، نسخه، سازنده و اطلاعات انتشار در بخش «درباره برنامه» قرار دارد.'],
      ['پشتیبانی', 'برای مسائل فنی یا عملیاتی، ابتدا پیام خطا و نتیجه عملیات را ثبت کنید و سپس از مسیر پشتیبانی اعلام‌شده در برنامه پیگیری کنید.'],
      ['هم‌پوشانی با ساعت و آیکون‌های گوشی', 'اگر ساعت یا آیکون‌های نوار وضعیت روی هدر یا دکمه منو قرار گرفت، نسخه برنامه را از «بررسی نسخه جدید» کنترل کنید. پس از به‌روزرسانی، برنامه را یک بار کامل ببندید و دوباره باز کنید.'],
      ['دکمه‌های Back، Home و Recent', 'دکمه‌های ناوبری پایین گوشی به سیستم‌عامل Android تعلق دارند. در دستگاه‌های دارای ناوبری سه‌دکمه‌ای، باید روی زمینه پایین برنامه قابل دیدن باشند؛ اگر کنتراست مناسبی ندارند، حالت روشن/تیره گوشی و نسخه برنامه را بررسی کنید.'],
      ['درجه یا اطلاعات نامشخص', 'اگر درجه، سمت یا منطقه روی داشبورد ناقص است، از اتصال اینترنت و تکمیل اطلاعات پروفایل اطمینان حاصل کنید و یک‌بار کش را به‌روز کنید. برای اصلاح اطلاعاتی که از سرور می‌آیند، از مدیر مربوط کمک بگیرید.'],
    ],
  },
];

function Section({ section, open, onPress }) {
  return (
    <View style={styles.card}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={section.title} style={styles.sectionHeader} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.sectionIcon}><MaterialCommunityIcons name={section.icon} size={23} color={C.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/></View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={23} color={C.brand} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/>
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

export default function HelpScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsedMatches, setCollapsedMatches] = useState([]);
  const version = currentVersion();
  const normalizedQuery = query.trim().toLocaleLowerCase('fa-IR');
  const visibleSections = normalizedQuery ? SECTIONS.map((section, index) => ({
    section: { ...section, items: section.title.toLocaleLowerCase('fa-IR').includes(normalizedQuery) ? section.items : section.items.filter(([title, description]) => `${title} ${description}`.toLocaleLowerCase('fa-IR').includes(normalizedQuery)) },
    index,
  })).filter(({ section }) => section.items.length) : SECTIONS.map((section, index) => ({ section, index }));

  const doCheckUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try { await checkForUpdate(true); } catch (_) { Alert.alert('خطا', 'بررسی نسخه جدید انجام نشد. اتصال اینترنت را بررسی کنید.'); }
    finally { setChecking(false); }
  };

  return (
    <View style={styles.screen}>
      <DetailPageHeader title="راهنمای برنامه" navigation={navigation} />
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

      <View style={styles.searchBox}>
        <TextInput accessibilityLabel="جست‌وجو در راهنمای برنامه" style={styles.searchInput} value={query} onChangeText={text => { setQuery(text); setCollapsedMatches([]); }} placeholder="جست‌وجو در موضوعات راهنما…" placeholderTextColor={C.muted} returnKeyType="search" />
        {query ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="پاک‌کردن جست‌وجو" style={styles.clearSearch} onPress={() => setQuery('')}><Text style={styles.clearSearchText}>پاک‌کردن</Text></TouchableOpacity> : null}
      </View>

      {visibleSections.map(({ section, index }) => (
        <Section
          key={section.title}
          section={section}
          open={normalizedQuery ? !collapsedMatches.includes(index) : openIndex === index}
          onPress={() => normalizedQuery ? setCollapsedMatches(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]) : setOpenIndex(openIndex === index ? -1 : index)}
        />
      ))}
      {visibleSections.length === 0 ? <View style={styles.notice}><Text style={styles.noticeTitle}>موضوعی پیدا نشد</Text><Text style={styles.noticeText}>عبارت کوتاه‌تری جست‌وجو کنید یا جست‌وجو را پاک کنید.</Text><TouchableOpacity accessibilityRole="button" onPress={() => setQuery('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>نمایش همهٔ موضوعات</Text></TouchableOpacity></View> : null}

      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: checking }} accessibilityLabel="بررسی نسخه جدید برنامه" style={[styles.updateButton, checking && {opacity:0.5}]} onPress={doCheckUpdate} disabled={checking} activeOpacity={0.82}>
        <Text style={styles.updateButtonText}>{checking ? 'در حال بررسی نسخه جدید…' : 'بررسی نسخه جدید'}</Text>
      </TouchableOpacity>

      <TouchableOpacity accessibilityRole="button" style={styles.supportButton} onPress={() => Linking.openURL('tel:09982118899').catch(() => Alert.alert('تماس برقرار نشد', 'شماره پشتیبانی: ۰۹۹۸۲۱۱۸۸۹۹'))} activeOpacity={0.82}>
        <Text style={styles.supportButtonText}>تماس با پشتیبانی: ۰۹۹۸۲۱۱۸۸۹۹</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>خطیار — سامانه مدیریت و نظارت بر ناوگان تاکسیرانی</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  page: { flex: 1, backgroundColor: C.paper },
  content: { padding: 14, paddingBottom: 36 },
  hero: { backgroundColor: C.brand, borderRadius: 24, padding: 23, marginBottom: 12, alignItems: 'flex-end' },
  brand: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 27, textAlign: 'right', writingDirection: 'rtl' },
  heroTitle: { width: '100%', color: '#fff', fontFamily: FONT.bold, fontSize: 17, lineHeight: 27, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  heroText: { width: '100%', color: '#dcefe9', fontFamily: FONT.regular, fontSize: 12, lineHeight: 21, marginTop: 7, textAlign: 'right', writingDirection: 'rtl' },
  versionBadge: { alignSelf: 'flex-start', marginTop: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  versionText: { color: '#fff', fontFamily: FONT.bold, fontSize: 11, textAlign: 'center', writingDirection: 'rtl' },
  notice: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 15, marginBottom: 10 },
  noticeTitle: { color: C.ink, fontFamily: FONT.bold, fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  noticeText: { color: C.muted, fontFamily: FONT.regular, fontSize: 12, lineHeight: 21, marginTop: 6, textAlign: 'right', writingDirection: 'rtl' },
  searchBox: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 14, alignItems: 'center', paddingHorizontal: 12, marginBottom: 12, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: C.ink, textAlign: 'right', minHeight: 48 },
  clearSearch: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  clearSearchText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 16, marginBottom: 9, overflow: 'hidden' },
  sectionHeader: { minHeight: 64, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  sectionTitle: { flex: 1, color: C.ink, fontFamily: FONT.bold, fontSize: 14, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  sectionBody: { borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 15, paddingBottom: 7 },
  item: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  itemTitle: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'right', writingDirection: 'rtl' },
  itemText: { color: '#475569', fontFamily: FONT.regular, fontSize: 13, lineHeight: 23, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  updateButton: { backgroundColor: C.brand, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  updateButtonText: { color: '#fff', fontFamily: FONT.bold, fontSize: 13, textAlign: 'center', writingDirection: 'rtl' },
  supportButton: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  supportButtonText: { color: C.brand, fontFamily: FONT.bold, fontSize: 12, textAlign: 'center', writingDirection: 'rtl' },
  footer: { color: C.muted, fontFamily: FONT.regular, fontSize: 10, textAlign: 'center', marginTop: 17, writingDirection: 'rtl' },
});
