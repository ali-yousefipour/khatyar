'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const bundle=fs.readFileSync(path.join(__dirname,'../app/assets/panel.bundle.js'),'utf8');
const start=bundle.indexOf('function Dashboard()');
const end=bundle.indexOf('function DashboardDiscipline(',start);
assert.ok(start>=0 && end>start,'use compiled dashboard logic, not a fake tab implementation');
const stats={drivers:12,lines:6,today_attendance:9,unpaid_bills:2,notices_month:3};
const workers={groups:[{title:'گروه آزمایشی',role:'supervisor',top:[{id:1,name:'نیروی آزمایشی',total:3}],bottom:[]}]};
const defaults=[stats,workers,'ready','overview',null,'',false];
const state=defaults.slice();
let cursor=0;
const node=(type,props,...children)=>({type,props:{...props,children}});
const context={
  React:{createElement:node},
  useState(value){const index=cursor++;if(!(index in state))state[index]=value;return [state[index],next=>{state[index]=typeof next==='function'?next(state[index]):next;}];},
  useEffect(){},
  useRef(initial){return {current:initial};},
  db:{stats:async()=>stats,topWorkers:async()=>workers},
  GET:async()=>[],
  fa:String,
  BirthdayCelebration:()=>null,
  DashboardDiscipline:()=>null,
  PersonnelDistributionDashboard:()=>null,
  LiveStaffDashboard:()=>null,
  WorkerGroup:()=>null,
  DashboardManagementInsights:()=>null,
  GROUP_COLORS:{supervisor:'#075b4d'},
};
vm.runInNewContext(bundle.slice(start,end)+'\nthis.Dashboard=Dashboard;',context);
const flatten=tree=>Array.isArray(tree)?tree.flatMap(flatten):tree&&typeof tree==='object'&&tree.props?[tree,...flatten(tree.props.children)]:[];
const render=()=>{cursor=0;return flatten(context.Dashboard());};
const keys=['overview','personnel','attendance','performance','insights'];
for(const key of keys){
  state[3]=key;
  const rendered=render();
  const tabs=rendered.filter(el=>el.props.role==='tab');
  assert.equal(tabs.length,5,'every management tab remains in the compiled dashboard');
  const active=tabs.filter(el=>el.props['aria-selected']===true);
  assert.equal(active.length,1,'only one tab may be selected');
  assert.equal(active[0].props.id,'dashboard-tab-'+key);
  assert.equal(active[0].props.tabIndex,0,'selected tab must be keyboard reachable');
  assert.ok(tabs.filter(el=>el.props.tabIndex===-1).length===4,'other tabs follow roving tabindex');
  const panels=rendered.filter(el=>el.props.role==='tabpanel');
  assert.equal(panels.length,1,'only the selected tab panel is visible');
  assert.equal(panels[0].props.id,'dashboard-content-'+key);
  assert.equal(panels[0].props['aria-labelledby'],active[0].props.id);
}
state[3]='overview';
let rendered=render();
const tabs=rendered.filter(el=>el.props.role==='tab');
tabs[2].props.onClick();
assert.equal(state[3],'attendance','click switches to attendance');
// Re-render after the selected tab changes. React replaces the event
// closures on commit; recycling the old element creates an impossible state.
rendered=render();
const freshTabs=rendered.filter(el=>el.props.role==='tab');
let prevented=false,focused=-1;
const fakeTabs=freshTabs.map((_,i)=>({focus(){focused=i;}}));
freshTabs[2].props.onKeyDown({key:'Home',preventDefault(){prevented=true;},currentTarget:{parentElement:{querySelectorAll(){return fakeTabs;}},...fakeTabs[2]}});
assert.ok(prevented,'keyboard navigation prevents page scroll');
assert.equal(focused,0,'Home focuses first dashboard tab');
assert.equal(state[3],'overview','Home selects first dashboard tab');
state[3]='overview';
state[6]=true;
state[0]=null;
assert.ok(render().some(x=>x.props.className==='panel'),'initial loading has a safe visible placeholder');
state[6]=false;state[5]='خطای آزمون';
assert.ok(render().some(x=>x.type==='button'&&typeof x.props.onClick==='function'),'loading failure keeps a retry action');
console.log('PASS compiled dashboard: 5 tab interactions, ARIA, keyboard, loading and error states');
