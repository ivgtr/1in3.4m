import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createEncounter} from '../src/domain/encounter.js';
import {create,startLife,evolveCompany,prepareTimeline,registerDecision,requestStrategy,requestHelp,autoDecision,autoCanChoose,availableDecisionOptions,orderBudget,tickMonth,continueLife,restore,currentLeader} from '../src/domain/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
const fresh=(seed=1)=>{const s=prepareTimeline(evolveCompany(startLife(create(seed,'比較',config,'independent'))));s.pending=null;return s;};
function offer(s,value=271){s.pending={id:'offer',type:'large',at:s.q+1,entityId:s.clients[0].id,title:'追加案件',text:'',value,duration:2,causes:[],options:[{id:'hire',title:'採用',cost:35},{id:'partner',title:'外注',cost:0},{id:'decline',title:'見送る',cost:0}]};return prepareTimeline(s);}
test('余力があれば現体制で受注でき、積み残し・同月登録済み案件・事故を余力に含める',()=>{
 let s=fresh();s.skill=2;s.macro=1;s.last.revenue=326;const capacity=orderBudget(s).capacity,committed=orderBudget(s).committed;s=offer(s);assert.ok(s.pending.options.some(a=>a.id==='inhouse'));assert.match(s.pending.text,/積み残し/);
 const cash=s.cash,people=s.people.length;s=registerDecision(s,'inhouse');assert.equal(s.cash,cash);assert.equal(s.people.length,people);assert.equal(s.calendarMonth,0);assert.equal(s.contracts.at(-1).outsource,false);assert.equal(s.threads.length,0);
 const second=offer(s);assert.equal(second.pending.budget.committed,committed+271);
 second.backlog=capacity;assert.ok(!availableDecisionOptions(second).some(a=>a.id==='inhouse'));assert.throws(()=>registerDecision(second,'inhouse'));second.backlog=0;second.life.recoveryLoss=1;assert.ok(!availableDecisionOptions(second).some(a=>a.id==='inhouse'));
});
test('取引整理の対象・受注・維持費・整理費が選ぶ前に分かり、確定値と一致する',()=>{
 let s=fresh();s.clients[0].value=122.65;s.clients[0].serviceCost=42;s=requestStrategy(s);const d=s.pending,a=d.options.find(a=>a.id==='focus');assert.ok(a.title.includes(s.clients[0].name));assert.match(a.desc,/122.65.*42/);assert.equal(a.cost,15);assert.match(a.effect,/保証はありません/);
 const id=d.focusClientId,cash=s.cash;s=registerDecision(s,'focus');assert.equal(s.clients.find(c=>c.id===id).active,false);assert.equal(s.cash,cash-15);assert.equal(s.calendarMonth,0);
});
test('同じ境遇でも人と条件が変わり、紹介された会社をそのまま開始・再現できる',()=>{
 const casts=new Set(),heads=new Set(),counts=new Set();for(let seed=1;seed<=18;seed++){
 const a=createEncounter(seed,null,config,'independent'),b=createEncounter(seed,a.name,a.config,'independent');assert.deepEqual(a,b);casts.add(a.people.map(p=>p.name).join());heads.add(a.clients[0].name);counts.add(a.people.length);assert.equal(new Set([a.founder.name,...a.people.map(p=>p.name)]).size,a.people.length+1);
 const started=prepareTimeline(evolveCompany(startLife(a)));assert.equal(currentLeader(started).name,a.founder.name);assert.deepEqual(started.initial.people,a.people);assert.ok(started.events[0].text.includes(a.clients[0].name));assert.deepEqual(restore(JSON.stringify(started)).people,started.people);
 }assert.ok(casts.size>5);assert.ok(heads.size>3);assert.equal(counts.size,3);
});
test('おまかせは実行可能な選択だけを選び、終了判断の停止範囲と世界の乱数を守る',()=>{
 let s=fresh();s.cash=0;s=offer(s);const world=s.rng;const a=autoDecision(s,'safe');assert.equal(a.calendarMonth,0);assert.equal(a.rng,registerDecision(s,a.decisions.at(-1).choiceId).rng);assert.notEqual(a.decisions.at(-1).choiceId,'hire');assert.equal(a.events.filter(e=>e.kind==='choice').at(-1).auto,true);assert.deepEqual(autoDecision(restore(JSON.stringify(s)),'safe'),a);
 s.pending={id:'rescue',type:'rescue',at:s.q+1,causes:[],options:[{id:'liquidate',title:'清算',cost:0,desc:'会社を閉じる'}]};assert.equal(autoCanChoose(s,'safe'),false);assert.throws(()=>autoDecision(s,'safe'));assert.equal(autoDecision(s,'all').ended,'liquidated');
 let recruiting=registerDecision(requestHelp(fresh(),'workload'),'recruit');recruiting=offer(recruiting);assert.ok(!availableDecisionOptions(recruiting).some(a=>a.id==='hire'));
});
test('おまかせの長期経路は保存復元で一致し、過去の会社の氏名を再抽選しない',()=>{
 function run(initial,save){let s=structuredClone(initial),guard=0;while(!s.ended&&s.calendarMonth<132&&guard++<600){s=s.pending?autoDecision(s,'all'):s.checkpoint?continueLife(s):tickMonth(s);if(save)s=restore(JSON.stringify(s));}assert.ok(guard<600);return s;}
 for(const seed of [3,8,19]){const s=prepareTimeline(evolveCompany(startLife(createEncounter(seed,null,config))));s.cash=100000;const a=run(s,false),b=run(s,true);assert.deepEqual(a,b);assert.equal(new Set(a.events.map(e=>e.id)).size,a.events.length);for(const h of a.history)assert.ok(Math.abs(h.cash-(h.startCash+h.collections+h.borrow-h.operating+h.prepaid-h.interest-h.repay))<.011);}
 const old=fresh();old.calendarMonth=117;old.q=39;const people=structuredClone(old.people),rng=old.rng;const loaded=prepareTimeline(restore(JSON.stringify(old)));assert.deepEqual(loaded.people,people);assert.equal(loaded.calendarMonth,117);assert.equal(loaded.seed,old.seed); // discovery may consume the world RNG, casting never runs on load
});
