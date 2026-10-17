import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {create,prepareTimeline,registerDecision,tickMonth,requestHelp,restore} from '../dist/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../dist/model-data.json',import.meta.url)));
test('同じ月に受注調整・外注・採用を登録でき、費用は一度だけ支払い、入社は3か月後',()=>{
 let s=prepareTimeline(create(10,'並行',config,'independent'));s.pending=null;s.cash=5000;s.last.load=2;s.backlog=200;s.config.parameters.hireChance=1;
 const before=s.cash;for(const id of ['adjust','bridge','recruit']){s=requestHelp(s,'workload');s=registerDecision(s,id);assert.equal(s.calendarMonth,0);assert.equal(s.q,0);assert.equal(s.history.length,0);}
 assert.equal(s.cash,before-145);assert.equal(s.prepaid,145);assert.equal(s.capacityOrder,180);assert.equal(s.threads.filter(t=>t.type==='recruit').length,1);
 const again=requestHelp(s,'workload');assert.throws(()=>registerDecision(again,'adjust'),/登録済み/);assert.ok(!again.pending.options.some(a=>a.id==='recruit'));
 const count=s.people.length;s=tickMonth(s);assert.equal(s.people.length,count);s=tickMonth(s);assert.equal(s.people.length,count);s=tickMonth(s);assert.equal(s.people.length,count+1);
 assert.equal(s.history.length,1);assert.equal(s.last.prepaid,145);assert.equal(s.last.capacityBonus,180);assert.equal(s.cash,Math.round((s.last.startCash+s.last.collections-s.last.operating+145-s.last.interest-s.last.repay)*100)/100);
 assert.equal(s.events.filter(e=>e.title.includes('仲間になった')).length,1);assert.equal(s.events.find(e=>e.title.includes('仲間になった')).month,3);
});
test('相談を保留したまま対処しても同じ年月で元の相談に戻る。交渉の結果は翌月',()=>{
 let s=prepareTimeline(create(2,'交渉',config,'builders'));const pending=s.pending.id;s.last.load=2;s.cash=5000;
 s=registerDecision(requestHelp(s,'workload'),'adjust');assert.equal(s.pending.id,pending);assert.equal(s.calendarMonth,0);
 s=registerDecision(s,'negotiate');assert.equal(s.contacts[0].status,'negotiating');assert.equal(s.calendarMonth,0);s=tickMonth(s);assert.equal(s.calendarMonth,1);assert.ok(['won','lost'].includes(s.contacts[0].status));
});
test('保存・復元と停止/速度に依存しない月次列、3境遇×20seedで同じ全状態・最終月60',()=>{
 for(const o of config.origins)for(let seed=1;seed<=20;seed++){
 const run=save=>{let s=prepareTimeline(create(seed,'再現',config,o.id)),guard=0;while(!s.ended&&guard++<150){if(s.pending){const options=s.pending.options.filter(a=>a.cost<=s.cash&&(!['hire','welcome','recruit'].includes(a.id)||!s.threads.some(t=>['join','recruit'].includes(t.type))));s=registerDecision(s,options[seed%options.length].id);}else s=tickMonth(s);if(save)s=restore(JSON.stringify(s));}assert.ok(s.ended);assert.equal(s.calendarMonth,s.q*3);assert.equal(new Set(s.events.map(e=>e.id)).size,s.events.length);assert.equal(s.history.length,s.q);return s;};assert.deepEqual(run(true),run(false));
 }
});
test('最終月の入社も終了前のイベント列に残る',()=>{
 let s=prepareTimeline(create(1,'最後',config,'local'));s.pending=null;s.q=19;s.calendarMonth=59;s.cash=10000;s.threads.push({id:'last-hire',type:'join',dueMonth:60,name:'最終月の社員',profile:config.peopleProfiles[0],sourceEvent:s.events[0].id});s=tickMonth(s);assert.equal(s.ended,'five-years');assert.ok(s.events.some(e=>e.month===60&&e.title.includes('最終月の社員')));assert.ok(!s.ui.summary);
});
