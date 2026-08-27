// دادهٔ آزمایشی کوچک برای تست کامل سیستم بدون فایل‌های بزرگ اکسل.
// اجرا:  node scripts/seed_demo.js
import { pool, q } from '../src/db.js';

async function main() {
  // خطوط
  const lines = [
    ['500', 'پایانه مسافربری', 'حرم مطهر'],
    ['221', 'میدان شریعتی', 'وکیل آباد'],
    ['128', 'چهارراه آزادشهر', 'میدان سعدی'],
  ];
  const lineIds = {};
  for (const [code, o, d] of lines) {
    const r = await q(`INSERT INTO lines(code,origin,destination,status) VALUES ($1,$2,$3,'فعال')
                       ON CONFLICT (code) DO UPDATE SET origin=$2 RETURNING id`, [code, o, d]);
    lineIds[code] = r.rows[0].id;
  }

  // موضوعات تذکر + قالب چک‌لیست
  for (const t of ['نظافت نامناسب', 'عدم پرداخت آبونمان', 'نقص تجهیزات کرایه', 'ظاهر نامناسب راننده'])
    await q(`INSERT INTO notice_reasons(title) VALUES ($1) ON CONFLICT DO NOTHING`, [t]);
  const tpl = await q(`INSERT INTO checklist_templates(title) VALUES ('چک‌لیست بازدید خودرو') RETURNING id`);
  for (const [i, l] of ['نظافت داخل خودرو', 'سلامت تاکسی‌متر', 'اعتبار پروانه‌ها', 'پوشش راننده'].entries())
    await q(`INSERT INTO checklist_items(template_id,label,sort_order) VALUES ($1,$2,$3)`, [tpl.rows[0].id, l, i]);

  // فرم نمونه
  await q(`INSERT INTO custom_forms(title,schema) VALUES ($1,$2)`,
    ['فرم بازدید میدانی', JSON.stringify([
      { key: 'result', label: 'نتیجهٔ بازدید', type: 'select', options: ['تأیید', 'نیاز به پیگیری'] },
      { key: 'desc', label: 'توضیحات', type: 'text' },
    ])]);

  // رانندگان + خودرو + فیش (با وضعیت‌های مختلف برای تست هشدار و بدهی)
  const drivers = [
    ['0012762016', 'زهرا', 'قدسی', 'فعال', 'فعال', '500'],
    ['0012833002', 'یونس', 'رستمی', 'فعال', 'منقضی', '500'],   // پروانه بهره‌برداری منقضی → هشدار
    ['0943040299', 'مجید', 'زارعی', 'فعال', 'فعال', '221'],
  ];
  let i = 1;
  for (const [nid, fn, ln, taxi, op, lineCode] of drivers) {
    const d = await q(`INSERT INTO drivers(national_id,first_name,last_name,taxi_lic_status,op_lic_status,
        taxi_lic_expire,op_lic_expire) VALUES ($1,$2,$3,$4,$5,'1405/12/29','1405/06/31')
        ON CONFLICT (national_id) DO UPDATE SET first_name=$2 RETURNING id`, [nid, fn, ln, taxi, op]);
    const plate = `${10 + i}ت${100 + i}-12`;
    const v = await q(`INSERT INTO vehicles(plate,model_name,line_id,owner_national_id)
        VALUES ($1,'سمند',$2,$3) ON CONFLICT (plate) DO UPDATE SET model_name='سمند' RETURNING id`,
      [plate, lineIds[lineCode], nid]);
    await q(`INSERT INTO vehicle_drivers(vehicle_id,driver_id,role)
             VALUES ($1,$2,'beneficiary') ON CONFLICT (vehicle_id,driver_id,shift) DO NOTHING`,
      [v.rows[0].id, d.rows[0].id]);
    // فیش‌ها: دو پرداخت‌نشده + یک پرداخت‌شده
    for (const [amt, st, mon] of [[2860000, 'در انتظار پرداخت', '1405/03'],
                                  [3720000, 'در انتظار پرداخت', '1405/02'],
                                  [2860000, 'پرداخت شده', '1404/12']])
      await q(`INSERT INTO bills(bill_id,pay_id,status,amount,national_id,phone,plate,pay_date,driver_id,vehicle_id)
               VALUES ($1,$2,$3,$4,$5,'09120727133',$6,$7,$8,$9)`,
        [`4679120543${300 + i}`, `00002860159${i}0`, st, amt, nid, plate, mon, d.rows[0].id, v.rows[0].id]);
    i++;
  }

  // تخصیص خط ۵۰۰ و ۲۲۱ به یک اپراتور نمونه (برای تست دسترسی و هشدار)
  const op = await q(`SELECT id FROM users WHERE role_id=(SELECT id FROM roles WHERE level=7 LIMIT 1) LIMIT 1`);
  if (op.rows[0]) {
    for (const c of ['500', '221'])
      await q(`INSERT INTO user_lines(user_id,line_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [op.rows[0].id, lineIds[c]]);
  }

  console.log('✓ دادهٔ آزمایشی ساخته شد: ۳ خط، ۳ راننده/خودرو، ۹ فیش، چک‌لیست و فرم نمونه.');
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
