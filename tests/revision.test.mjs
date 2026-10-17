import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {create,advance,resolve,requestHelp,cancelHelp,problems,restore,storyChapters,reviewRecord,experiencePatterns,personCapacity} from '../src/domain/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
test('警告から直接対処でき、取消は乱数・保留中の相談も含め完全に元へ戻る',()=>{
 let s=advance(create(11,'A',config,'builders'));s.last.load=2.67;s.backlog=450;s.cash=10000;
 const opened=requestHelp(s,'workload');assert.equal(opened.q,s.q);assert.equal(opened.rng,s.rng);assert.deepEqual(cancelHelp(restore(JSON.stringify(opened))),s);
 const out=resolve(opened,'bridge');assert.equal(out.q,s.q+1);assert.equal(out.last.capacityBonus,180);assert.equal(out.last.special,90);assert.equal(out.pending.id,s.pending.id);assert.equal(out.pending.at,out.q+1);assert.equal(out.helpReturnSerial,undefined);
 const adjust=resolve(opened,'adjust');assert.equal(adjust.workPlan.factor,.6);assert.equal(adjust.workPlan.until,adjust.q+1);assert.ok(adjust.threads.some(t=>t.type==='workReview'));
 const recruit=resolve(opened,'recruit');assert.ok(recruit.threads.some(t=>t.type==='recruit'));recruit.last.load=2;assert.ok(!requestHelp(recruit,'workload').pending.options.some(o=>o.id==='recruit'));
});
test('入社直後は会社の過去の疲労を引き継がず、本人の履歴と候補条件を保存する',()=>{
 const fixed=structuredClone(config);fixed.parameters.offerChance=1;fixed.parameters.hireChance=1;fixed.parameters.departureChance=0;
 let s=create(19,'A',fixed,'independent');s.cash=10000;s=advance(s);s=resolve(s,'hire');s.fatigue=100;s.pending=null;s.cooldowns.decision=999;s=advance(s);
 const p=s.people.find(p=>!p.founding);assert.ok(p);assert.equal(p.worked,1);assert.ok(p.strain<=25);assert.equal(p.salary,p.profile.salary);assert.deepEqual(restore(JSON.stringify(s)).people,s.people);
 s.pending=null;s.scannedQuarter=-1;s.cooldowns.decision=0;s.cooldowns.team=0;s.people.forEach(x=>{if(x.founding)x.strain=0;});s=advance(s);assert.notEqual(s.pending?.type,'team');
 const caps=config.peopleProfiles.map(profile=>personCapacity(s,{profile,worked:0}));assert.equal(new Set(caps).size,3);
});
test('相談の抜粋は採用判断と入社を必ず含み、旧版の結果も改変しない',()=>{
 const s=create(1,'A',config,'local');s.q=8;s.ended='five-years';s.people=[{id:'p90',name:'加藤',joined:4,sourceEvent:'e91',active:true,founding:false,salary:130}];
 s.events.push({id:'e91',q:3,kind:'choice',topic:'hiring',title:'加藤を迎える',text:'',entities:[],causes:[]},{id:'e92',q:4,kind:'turning',topic:'people',title:'加藤が入社',text:'',entities:['p90'],causes:['e91']},{id:'e93',q:8,kind:'choice',topic:'team',title:'仕事を減らす',text:'',entities:['p90'],causes:[]});
 s.decisions=[{id:'d90',q:8,type:'team',choiceId:'relieve',choice:'仕事を減らす',entityId:'p90',eventId:'e93'}];
 assert.deepEqual(storyChapters(s)[0].events.map(e=>e.id),['e91','e92','e93']);const old={...s,model:'company-life-2'},raw=JSON.stringify(old);assert.equal(JSON.stringify(reviewRecord(raw)),raw);assert.deepEqual(storyChapters(reviewRecord(raw)),storyChapters(s));
});
test('比較は判断後2期の観測を必要とし、関係が続かなかった会社も含める',()=>{
 const s=create(1,'A',config,'local');s.decisions=[{q:1,type:'large',choiceId:'partner',entityId:'c1'},{q:3,type:'workload',choiceId:'adjust',before:{load:2.67}}];s.history=[{q:4,activeClientIds:['c1'],cash:100,load:1}];assert.equal(experiencePatterns(s).length,0);s.history.push({q:5,activeClientIds:[],cash:100,load:.7});assert.equal(experiencePatterns(s)[0].continued,false);assert.equal(experiencePatterns(s)[0].observedAt,5);
});
