const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const web=read('php/app/assets/personnel-vehicle-checklist-enhancement.js');
const native=read('mobile/src/screens/PersonnelVehicleChecklistScreen.js');
const styles=read('php/app/assets/android-web-ux.css');
const radio=read('mobile/plugins/khatyar-radio-native/KhatyarRadioService.java');
const compact=read('mobile/plugins/khatyar-radio-native/resources/layout/khatyar_radio_notification.xml');
for(const source of [web,native]){
 assert.match(source,/در انتظار بررسی/);
 assert.match(source,/نیازمند اصلاح/);
 assert.match(source,/plate_part_left/);
 assert.match(source,/plate_part_right/);
 assert.match(source,/motorcycle_plate_top/);
 assert.match(source,/motorcycle_plate_bottom/);
}
assert.match(web,/plateHtml\(a\)/);
assert.match(web,/op=detail&id=/);
assert.match(web,/وضعیت تمام موارد چک‌لیست را انتخاب کنید/);
assert.match(web,/برای تأیید نهایی باید همه موارد تأیید شده باشند/);
assert.match(native,/<PlateDisplay asset=\{a\}\/>/);
assert.match(styles,/\.pva-display-motor-top/);
assert.match(styles,/\.pva-display-car-cell/);
assert.match(radio,/شروع صحبت/);
assert.match(compact,/android:maxLines="1"/);
assert.match(compact,/\?android:attr\/textColorPrimary/);
console.log('PASS checklist plates/statuses and notification readability');
