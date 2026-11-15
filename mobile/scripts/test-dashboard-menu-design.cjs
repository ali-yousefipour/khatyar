const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dashboard = fs.readFileSync(path.resolve(__dirname, '../src/screens/DashboardScreen.js'), 'utf8');
const tiles = fs.readFileSync(path.resolve(__dirname, '../src/components/DashboardTiles.js'), 'utf8');
const drawer = fs.readFileSync(path.resolve(__dirname, '../src/DrawerMenuScreen.js'), 'utf8');

const cards = dashboard.match(/const MENU = \[([\s\S]*?)\];/)?.[1] || '';
const mapping = dashboard.match(/const MENU_ICONS = \{([\s\S]*?)\};/)?.[1] || '';
const cardRoutes = [...cards.matchAll(/\br:\s*'([^']+)'/g)].map(m => m[1]);
const iconRoutes = [...mapping.matchAll(/"([^"]+)":\s*"[^"]+"/g)].map(m => m[1]);
assert.equal(cardRoutes.length, 37, 'Do not inadvertently remove dashboard features');
assert.equal(new Set(cardRoutes).size, 37, 'Each dashboard route should be unique');
for (const route of cardRoutes) assert.ok(iconRoutes.includes(route), `Missing vector icon for ${route}`);
assert.doesNotMatch(cards, /icon3d:|glyph:/, 'All menu tiles must use one scalable vector icon family');
assert.match(dashboard, /\['favorites', 'موارد دلخواه'\]/, 'Favorites tab must exist');
assert.doesNotMatch(dashboard, /\['general', 'عمومی'\]/, 'Old category tabs should be removed');
assert.match(dashboard, /favoriteRoutes\.includes\(m\.r\)/, 'Favorites must be restricted to accessible cards');
assert.match(dashboard, /dashboard-favorites:v1:/, 'Favorites must be scoped by account');
assert.match(dashboard, /fontScale > 1\.6/, 'Dashboard grid must respond to large system fonts');
assert.match(dashboard, /rankCountFor/, 'Rank insignia must be derived from user role');
assert.match(dashboard, /label=\{m\.t\}/, 'Every tool must receive its actual label');
assert.match(tiles, /accessibilityLabel=\{label\}/, 'Every tool must expose its label');
assert.match(dashboard, /menuTab: \{ minHeight: 48/, 'Category chips should have >=48dp touch targets');
assert.match(dashboard, /allowed\.includes\(m\.r\)/, 'New visual components must still respect role access');

const itemRoutes = [...(drawer.match(/const ITEMS = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/\['([^']+)'/g)].map(m => m[1]);
const sections = drawer.match(/const MENU_SECTIONS = \[([\s\S]*?)\];/)?.[1] || '';
for (const route of [...itemRoutes, 'SendQueue']) assert.ok(sections.includes(`'${route}'`), `Drawer section omitted ${route}`);
assert.match(drawer, /roleAppAccess\.includes\(route\)/, 'Drawer must continue to filter unauthorized links');
assert.match(drawer, /paddingTop:insets\.top\+14/, 'Drawer header should honor the status bar safe area');
assert.match(drawer, /roleAccessError/, 'Drawer needs a recoverable network-error state');
// Compact dashboard UX regression guards: no oversized shortcuts or always-open KPI cards.
for (const snippet of [
  "const [statsExpanded, setStatsExpanded] = useState(false)",
  "const [clockNow, setClockNow] = useState(() => new Date())",
  "clockNow.getHours() < 19 ? 'عصر بخیر'",
  ": 'شب بخیر'",
  "greeting}",
  "style={s.profileInfoRow}",
  "todayFaLong()",
  "weatherPresentation(weather.weather_code",
  "statsExpanded && <View style={s.kpis}>",
  "accessibilityState={{expanded:statsExpanded}}",
  "style={s.toolbarControls}",
  "setOrderModal(true)",
  "setMenuTab(key)",
]) assert.ok(dashboard.includes(snippet), `Dashboard: missing ${snippet}`);
assert.match(dashboard, /quickActionIcon: \{ height:37/, 'Shortcut icons must be compact');
assert.match(dashboard, /quickAction: \{ width:57, minHeight:64/, 'Shortcuts must have compact fixed width');
assert.match(dashboard, /quickActions: \{ flexDirection:'row', flexWrap:'wrap', justifyContent:'flex-start'/, 'Shortcuts must be left packed without space-between');
assert.match(dashboard, /setProfileRank\(/, 'Dashboard must load rank from full server profile');
assert.match(dashboard, /searchBox: \{ marginHorizontal: 16, marginBottom: 9, minHeight: 43/, 'Tool search must be short');

const app = fs.readFileSync(path.resolve(__dirname, '../App.js'), 'utf8');
const config = fs.readFileSync(path.resolve(__dirname, '../app.config.js'), 'utf8');
const systemPlugin = fs.readFileSync(path.resolve(__dirname, '../plugins/withSystemNavigationContrast.js'), 'utf8');
assert.match(app, /paddingTop:android\?insets\.top:0/, 'Root must avoid overlapping Android status icons');
assert.match(app, /Math\.max\(insets\.bottom,18\)/, 'System navigation requires reserved contrast space');
assert.match(config, /withSystemNavigationContrast/, 'Android config must enable navigation contrast plugin');
assert.match(systemPlugin, /android:navigationBarColor', '#073d35'/, 'System navigation bar must use a contrasting dark surface');
assert.match(systemPlugin, /android:windowLightNavigationBar', 'false'/, 'Navigation controls must use light icons');
for (const rule of ['android:windowLightNavigationBar', 'android:navigationBarColor', 'android:enforceNavigationBarContrast']) {
  assert.ok(systemPlugin.includes(rule), `Android navigation theme missing ${rule}`);
}
const help=fs.readFileSync(path.resolve(__dirname,'../src/screens/HelpScreen.js'),'utf8');
for(const topic of ['فیلترهای پیشرفته گزارشات','آمار فعالیت من','درجه یا اطلاعات نامشخص','دکمه‌های Back، Home و Recent','انتخاب گیرنده و رونوشت'])assert.ok(help.includes(topic),`Help missing: ${topic}`);
console.log('PASS dashboard compact UX and Android navigation contrast contracts');
console.log('PASS dashboard/menu redesign: responsive cards, favorites, rank labels, role-scoped drawer');
