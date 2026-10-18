import React from 'react';
import { View, Text, Image } from 'react-native';
import { FONT } from '../theme';
import { faNum } from '../num';
import layout from '../../assets/payroll-access-layout.json';

// Faithful placement of the controls exported from the website's Access print layout.
// A5 landscape output is captured at 2480 x 1748 by the calling screen.
const number = value => value === undefined || value === null || value === '' ? '—' : String(value);
const normalized = key => String(key || '').replace(/\s+/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
export default function PayrollAccessSlip({ slip, width }) {
  if (!slip) return null;
  const scale = width / Number(layout.width);
  const h = Number(layout.height) * scale;
  const data = slip.row?.data || {};
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [normalized(key), value]));
  const byName = {
    'نام': data.first_name || slip.row.employee_name?.split(' ')[0],
    'نام خانوادگی': data.last_name || slip.row.employee_name?.split(' ').slice(1).join(' '),
    'سمت': slip.row.role_title,
    'خالص پرداختی': slip.row.net,
    'کد ملی': slip.row.national_code
  };
  const getValue = source => {
    if (Object.prototype.hasOwnProperty.call(byName, source)) return byName[source];
    return fields[normalized(source)];
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
        fontFamily: control.FontWeight ? FONT.bold : FONT.regular,
        fontSize: Math.max(3, Number(control.FontSize || 10) * scale * 6.8),
        color: '#161616', textAlign: control.TextAlign === '2' ? 'right' : 'center',
        textAlignVertical: 'center', includeFontPadding: false
      }]}>{isField ? faNum(number(value)) : value}</Text>;
    })}
    <Text style={{ position: 'absolute', bottom: 2 * scale, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.bold, fontSize: Math.max(6, 105 * scale), color: '#b42318' }}>
      این فیش حقوق بدون امضای مدیرعامل و مهر شرکت فاقد ارزش قانونی است
    </Text>
  </View>;
}
