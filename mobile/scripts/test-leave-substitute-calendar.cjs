'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/screens/CheckInScreen.js'),'utf8');
const request=fs.readFileSync(path.join(__dirname,'../src/screens/RequestsScreen.js'),'utf8');
function getFunction(name,next){
 const from=src.indexOf('function '+name+'('),until=src.indexOf('function '+next+'(',from);
 assert.ok(from>=0&&until>from,'missing '+name+' helper');
 return src.slice(from,until);
}
const context={faNum:x=>String(x),gregorian_to_jalali_client:(y,m,d)=>[1405,9,15]};
vm.runInNewContext(getFunction('shiftIntervals','shiftJalaliFa')+getFunction('shiftCoverageJdate','shiftCoverageCaption')+getFunction('shiftCoverageCaption','CheckInShiftTab'),context);
const intervals=context.shiftIntervals({segments:[{s:'06:00',e:'14:00'},{start:'14:00',end:'22:00'}]});
assert.equal(intervals.length,2,'both advanced day segments must be read');
assert.equal(intervals[0].start,'06:00');
assert.equal(intervals[1].end,'22:00');
assert.equal(context.shiftCoverageJdate('1405-09-15'),'1405-09-15','preserve Jalali day');
assert.equal(context.shiftCoverageJdate('2026-12-06'),'1405-09-15','convert Gregorian schedule days to Jalali');
assert.equal(context.shiftCoverageCaption({leave:[{unit:'daily'}]}),'مرخصی تأییدشده');
assert.equal(context.shiftCoverageCaption({leave:[{unit:'hourly'}]}),'مرخصی ساعتی تأییدشده');
assert.equal(context.shiftCoverageCaption({}),null,'pending or unapproved leave must not have a confirmed label');
for(const part of ["'/my/shift-cover-status?dates='",'requesterShift=coverageDay.cover?.[0]?.shift','sourceIntervals=shiftIntervals(requesterShift)','setCoverage(related?.days||{})','coverNames.join'])assert.ok(src.includes(part),'missing live coverage binding: '+part);
assert.ok(src.includes('shiftMissing=days.length===0'),'temporary substitute shift days display even without permanent shift');
assert.ok(request.includes('setSub(prev=>'),'selection must be checked after a date change');
assert.ok(request.includes('available:false,reason:'),'stale substitute selection must be disabled');
console.log('PASS shift calendar: approved leave, named substitute, authoritative requester shift and dates');
