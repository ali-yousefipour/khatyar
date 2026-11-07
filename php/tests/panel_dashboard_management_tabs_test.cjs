const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'tools/panel_source.jsx'),'utf8');
const styles=fs.readFileSync(path.join(root,'app/assets/khatyar-emerald-system.css'),'utf8');
const html=fs.readFileSync(path.join(root,'app/panel.html'),'utf8');

for(const tab of ['overview','personnel','attendance','performance','insights']){
  assert.ok(source.includes('"'+tab+'"'), tab+' must be present in the dashboard navigation');
  assert.ok(source.includes('dashboard-content-'+tab),tab+' must have a controlled panel');
}
assert.match(source,/role="tablist" aria-label="دسته‌بندی داشبورد مدیریت"/);
assert.match(source,/aria-selected=\{activeTab===key\}/);
assert.match(source,/function DashboardManagementInsights/);
assert.match(source,/مجموع فعالیت‌های نمونه نیروهای برتر هر سمت؛ نه کل سازمان/);
assert.match(source,/function AccountPasswordDialog/);
assert.match(source,/SEND\('POST','\/admin\/change-password'/);
assert.match(source,/aria-haspopup="menu" aria-expanded=\{accountOpen\}/);
assert.match(source,/خروج از وب‌سایت/);
assert.match(source,/className="burger"[\s\S]*?<svg viewBox="0 0 24 24"/);
assert.match(styles,/\.layout \.main > \.top \.burger svg/);
assert.match(styles,/\.dashboard-primary-tabs/);
assert.match(styles,/\.account-dropdown/);
assert.match(html,/panel\.bundle\.js\?v=20261107\.2002/);
console.log('Dashboard tabs, evidence-labeled analysis, responsive menu and account actions are implemented.');
