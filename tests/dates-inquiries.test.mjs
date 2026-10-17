import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {create,prepareTimeline,registerDecision,tickMonth,restore} from '../dist/model.js';
import {decisionMonth,personJoinedMonth,personLeftMonth,clientSinceMonth} from '../dist/dates.js';
import {REAL_MOMENTS,momentAssignments} from '../dist/insights.js';
const config=JSON.parse(fs.readFileSync(new URL('../dist/model-data.json',import.meta.url)));
test('0.6保存済みの判断・入退社・取引をイベントの実月に揃える',()=>{
 const s={events:[{id:'choice',month:4,entities:[]},{id:'join',month:6,entities:['p']},{id:'left',month:10,kind:'risk',topic:'people',entities:['p'],title:'別々の道'},{id:'contract',month:7,kind:'turning',topic:'client',entities:['c']} ]};
 assert.equal(decisionMonth(s,{q:1,eventId:'choice'}),4);assert.equal(personJoinedMonth(s,{id:'p',joined:1,joinEvent:'join'}),6);assert.equal(personLeftMonth(s,{id:'p',left:3}),10);assert.equal(clientSinceMonth(s,{id:'c',since:2}),7);
 assert.equal(decisionMonth(s,{q:2,eventId:'unknown'}),6);
});
function inquiry(kind){const s=create(8,'相談',config,'builders');s.cash=5000;s.timelineVersion=1;
 if(kind==='busy')s.last.load=2;
 if(kind==='trusted'){s.clients.push({id:'trusted',name:'古くからの顧客',active:true,relation:80,since:0,value:100});s.contacts[0].sourceId='trusted';}
 if(kind==='retry'){s.contacts.push({id:'lost',name:'失注した相手',status:'lost'});s.contacts[0].sourceId='lost';}
 return prepareTimeline(s);
}
test('紹介関係と仕事量で選択肢・費用・実際の受注量が変わり、保存しても条件を保持',()=>{
 const first=inquiry('first'),busy=inquiry('busy'),trusted=inquiry('trusted'),retry=inquiry('retry');
 assert.equal(busy.pending.options.length,2);assert.equal(first.pending.options.length,3);assert.equal(trusted.pending.options.find(o=>o.id==='negotiate').cost,8);assert.equal(retry.pending.trialValue,100);
 const s=registerDecision(restore(JSON.stringify(busy)),'trial');assert.equal(s.contracts.at(-1).value,90);
 trusted.config.parameters.salesChance=1;const answer=tickMonth(registerDecision(trusted,'negotiate'));assert.equal(answer.clients.at(-1).value,240);
});
test('実調査は回答数と測定内容を保持し、同じ発見を毎回繰り返さない',()=>{
 assert.equal(REAL_MOMENTS.hiring.n,2078);assert.equal(REAL_MOMENTS.hiring.values[0],26.6);assert.equal(REAL_MOMENTS.growth.values.reduce((a,b)=>a+b,0),100);
 const s={events:[{id:'a'},{id:'b'},{id:'j',kind:'turning',topic:'people'}],decisions:[{eventId:'a',choiceId:'recruit'},{eventId:'b',choiceId:'recruit'}],people:[{joinEvent:'j'}]};assert.deepEqual([...momentAssignments(s)],[['a','hiring'],['j','training']]);
});
