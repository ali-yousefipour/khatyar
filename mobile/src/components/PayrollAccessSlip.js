import React from 'react';
import { View, Text, Image } from 'react-native';
import { FONT } from '../theme';
import { faNum } from '../num';
import layout from '../../assets/payroll-access-layout.json';

// Faithful placement of the controls exported from the website's Access print layout.
// A5 landscape output is captured at 2480 x 1748 by the calling screen.
const normalized = key => String(key || '').normalize('NFKC').replace(/[\s\u200c\u200f\u200e_\-]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه');
export default function PayrollAccessSlip({ slip, width }) {
  if (!slip) return null;
  const scale = width / Number(layout.width);
  const h = Number(layout.height) * scale;
  const data = slip.row?.data && typeof slip.row.data === 'object' ? slip.row.data : {};
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [normalized(key), value]));
  // API may return machine-readable columns while Access uses Persian ControlSource names.
  // Match the actual PHP Payroll::FIELDS payload, not guessed API names.
  const aliases = {
    'روزکارکردکل': ['days'], 'مرخصی': ['leave_days'], 'غیبت': ['absence_days'],
    'استعلاجی': ['sick_days'], 'روزکارکردموثر': ['effective_days'],
    'دستمزدروزانه': ['daily_wage'], 'مزدسنوات': ['seniority_wage'],
    'مزدشغل': ['job_wage'], 'حقوقماهیانه': ['monthly_wage'],
    'حقتاهل': ['marriage'], 'حقاولاد': ['child_allowance'],
    'ساعتجمعهکاری': ['friday_hours'], 'جمعهکاری': ['friday_amount'],
    'ساعتتعطیلکاری': ['holiday_hours'], 'تعطیلکاری': ['holiday_amount'],
    'ساعتشبکاری': ['night_hours'], 'شبکاری': ['night_amount'],
    'درصدنوبتکاری': ['shift_percent'], 'مبلغنوبتکاری': ['shift_amount'],
    'ساعتاضافهکار': ['overtime_hours'], 'اضافهکار': ['overtime_amount'],
    'حقمسکن': ['housing'], 'حقبن': ['food'],
    'مساعده/سایرکسورات': ['advance'], 'متفرقه': ['other'],
    'جمعحقوقومزایا': ['gross'], 'بیمهتامیناجتماعی': ['insurance'],
    'مالیات': ['tax'], 'خالصپرداختی': ['net'],
    'نام': ['first_name'], 'نامخانوادگی': ['last_name'],
    'کدملی': ['national_code'], 'سمت': ['role'],
    'تعدادفرزند': ['children'], 'صفرمجردیکمتاهل': ['married']
  };
  const byName = {
    'نام': data.first_name || slip.row.employee_name?.split(' ')[0],
    'نام خانوادگی': data.last_name || slip.row.employee_name?.split(' ').slice(1).join(' '),
    'سمت': slip.row.role_title,
    'خالص پرداختی': slip.row.net,
    'کد ملی': slip.row.national_code
  };
  const getValue = source => {
    const key = normalized(source);
    const fallback = fields[key];
    if (fallback !== undefined && fallback !== null && fallback !== '') return fallback;
    const alias = (aliases[key] || []).map(name => fields[normalized(name)]).find(value => value !== undefined && value !== null && value !== '');
    if (alias !== undefined) return alias;
    const explicit = Object.entries(byName).find(([name]) => normalized(name) === key)?.[1];
    if (explicit !== undefined && explicit !== null && explicit !== '') return explicit;
    return fallback;
  };
  const persianDigits = value => faNum(String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))));
  const displayValue = (value, control) => {
    if (value === undefined || value === null || value === '') return '—';
    const raw = String(value).trim();
    const ascii = raw.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .replace(/٫/g, '.').replace(/[٬,\s]/g, '');
    if (String(control.Format || '') !== '@' && /^[-+]?\d+(?:\.\d+)?$/.test(ascii)) {
      const n = Number(ascii);
      if (Number.isFinite(n)) return persianDigits(Math.round(n).toLocaleString('en-US'));
    }
    return persianDigits(raw);
  };
  const pos = c => ({
    position: 'absolute', left: Number(c.Left || 0) * scale,
    top: Number(c.Top || 0) * scale,
    width: Number(c.Width || 0) * scale, height: Number(c.Height || 0) * scale
  });
  return <View style={{ width, height: h, backgroundColor: '#fff', overflow: 'hidden' }}>
    {layout.controls.map((control, index) => {
      if (control.kind === 'Rectangle') return <View key={index} style={[pos(control), { borderWidth: Math.max(.5, scale * 15), borderColor: '#222' }]} />;
      if (control.kind === 'Line') return <View key={index} style={[pos(control), { backgroundColor: '#333', width: Math.max(1, Number(control.Width || 15) * scale) }]} />;
      if (control.kind === 'Image') return layout.logo ? <Image key={index} resizeMode="contain" source={{ uri: layout.logo.startsWith('data:') ? layout.logo : 'data:image/png;base64,' + layout.logo }} style={pos(control)} /> : null;
      if (control.kind !== 'TextBox' && control.kind !== 'Label') return null;
      const isField = control.kind === 'TextBox';
      const value = isField ? getValue(control.ControlSource || control.Name) : control.Caption;
      return <Text key={index} numberOfLines={2} adjustsFontSizeToFit style={[pos(control), {
        fontFamily: /nazanin|نازنین/i.test(String(control.FontName || '')) ? FONT.payrollNazanin : FONT.payrollHoma,
        // Do not request a synthetic bold face: it causes Android to substitute the bundled B Homa font.
        // Access layout coordinates are in twips (1/1440 inch); font sizes are points.
        // Convert both into the same physical coordinate space instead of an empirical 6.8 multiplier.
        fontSize: Math.max(3, Number(control.FontSize || 10) * width * 20 / Number(layout.width)),
        color: '#161616', textAlign: control.TextAlign === '2' ? 'right' : 'center',
        textAlignVertical: 'center', includeFontPadding: false
      }]}>{isField ? displayValue(value, control) : persianDigits(value ?? '')}</Text>;
    })}
    <Text style={{ position: 'absolute', bottom: 2 * scale, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.payrollHoma, fontSize: Math.max(6, 105 * scale), color: '#b42318' }}>
      این فیش حقوق بدون امضای مدیرعامل و مهر شرکت فاقد ارزش قانونی است
    </Text>
  </View>;
}
