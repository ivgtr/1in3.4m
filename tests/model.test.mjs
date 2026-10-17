import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MODEL,create,advance,resolve,restore,close,validate,staff,activeTeam,activeClients,costs,reflection} from '../src/domain/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<.035,`${a} != ${b}`);
function act(s,i=0){return s.pending?resolve(s,s.pending.options[i%s.pending.options.length].id):advance(s);}
function run(s,policy=0){let clicks=0;while(!s.ended&&clicks<100){s=act(s,policy+clicks);clicks++;}assert.ok(s.ended);return s;}
test('境遇は資金・顧客・仲間・費用が関連し、同じseedの再開が一致',()=>{
 const a=create(7,'A',config,'independent'),b=create(7,'B',config,'builders'),c=create(7,'C',config,'local');assert.equal(a.clients.length,2);assert.equal(b.clients.length,0);assert.equal(staff(b),2);assert.equal(staff(c),0);assert.ok(costs(b)>costs(c));assert.ok(c.cash<a.cash&&a.cash<b.cash);const drawn=create(81,'A',config);assert.deepEqual(create(81,'A',config,drawn.originId),drawn);
});
test('720社: 会計突合、異なる経験、平常期の早送り、節目数を確認',()=>{
 const output={},types=new Set();let skipped=0,chains=0;
 for(const origin of config.origins){let ended={},signature=new Set(),decisions=0;for(let seed=1;seed<=240;seed++){let s=create(seed,'検証会社',config,origin.id),i=0;while(!s.ended&&i<100){const old=s.q;s=act(s,seed+i++);if(s.q-old>1)skipped++;for(const h of s.history.filter(h=>h.q>old)){near(h.profit,h.revenue-h.operating-h.interest);near(h.cash,h.startCash+h.collections+h.borrow-h.operating-h.interest-h.repay);near(h.newAr,h.oldAr+h.revenue-h.collections);near(h.debt,h.startDebt+h.borrow-h.repay);assert.ok(Number.isFinite(h.cash)&&h.staff>=0&&h.debt>=0);}assert.ok(s.q<=20);}
 assert.ok(s.ended);assert.ok(s.decisions.length<=20);ended[s.ended]=(ended[s.ended]||0)+1;decisions+=s.decisions.length;signature.add(s.events.filter(e=>e.major).map(e=>e.topic+e.title).join('|'));for(const d of s.decisions)types.add(d.type);for(const e of s.events){for(const id of e.causes){assert.ok(s.events.some(p=>p.id===id),`失われた原因 ${id}`);}if(e.topic==='referral'&&e.causes.length)chains++;}assert.ok(reflection(s).length);}
 assert.ok(signature.size>200);output[origin.id]={ended,experiences:signature.size,averageDecisions:Math.round(decisions/240*10)/10};}
 assert.ok(skipped>30);assert.ok(chains>100);assert.equal(types.size,8);console.log(JSON.stringify({output,skipped,chains,decisionTypes:[...types]}));
});
test('節目の選択・後続の予約も、保存前後で完全再現',()=>{
 let a=create(293,'A',config,'builders'),b=restore(JSON.stringify(a)),i=0;
 while(!a.ended&&i<100){a=act(a,i%3);b=act(restore(JSON.stringify(b)),i%3);assert.deepEqual(a,b);i++;}
 assert.ok(a.ended);assert.throws(()=>advance(a));const pending=advance(create(10,'A',config,'builders'));assert.ok(pending.pending);const raw=JSON.stringify(pending);assert.deepEqual(restore(raw).pending,pending.pending);assert.throws(()=>advance(pending));assert.throws(()=>resolve(pending,'nonsense'));
});
test('平常期は3期までまとめ、相談を見つけたら時間を進めずに止まる',()=>{
 const quiet=structuredClone(config);for(const k of ['offerChance','pipelineChance','additionChance','contractionChance','departureChance','delayChance','underbookedPipelineChance'])quiet.parameters[k]=0;quiet.parameters.macroStay=1;
 let s=create(1,'静かな会社',quiet,'independent');s.clients.forEach(c=>{c.relation=40;c.value=100;});s.macro=1;s=advance(s);assert.equal(s.q,3);assert.deepEqual(s.batch,[1,2,3]);assert.equal(s.pending,null);
 const first=advance(create(1,'最初の顧客',config,'builders'));assert.equal(first.q,0);assert.equal(first.pending.type,'inquiry');assert.equal(first.pending.at,1);
});
test('失注の相手が後の紹介元となり、顧客と原因のIDが残る',()=>{
 const fixed=structuredClone(config);fixed.parameters.salesChance=0;fixed.parameters.referralChance=1;fixed.parameters.pipelineChance=0;fixed.parameters.offerChance=0;
 let s=create(8,'紹介の会社',fixed,'builders');s.cash=10000;s.experience=0;s=advance(s);const leadId=s.pending.entityId;s=resolve(s,'negotiate');assert.equal(s.contacts.find(c=>c.id===leadId).status,'lost');const lost=s.events.find(e=>e.title.includes('契約に届かなかった'));assert.ok(lost);
 for(let i=0;i<12&&!s.events.some(e=>e.topic==='referral'&&e.causes.includes(lost.id));i++)s=act(s,0);
 const referral=s.events.find(e=>e.topic==='referral'&&e.causes.includes(lost.id));assert.ok(referral);assert.ok(referral.entities.includes(leadId));assert.ok(s.contacts.some(c=>c.sourceEvent===referral.id&&c.sourceId===leadId));
});
test('大口受注から採用へ、案件が終わっても雇用が残る',()=>{
 const fixed=structuredClone(config);fixed.parameters.offerChance=1;fixed.parameters.hireChance=1;fixed.parameters.departureChance=0;fixed.parameters.contractionChance=0;fixed.parameters.pipelineChance=0;
 let s=create(19,'受注と人',fixed,'independent');s.cash=10000;s=advance(s);assert.equal(s.pending.type,'large');s=resolve(s,'hire');const contract=s.contracts.find(c=>c.kind==='large'),cause=contract.sourceEvent,original=staff(s);assert.ok(s.threads.some(t=>t.type==='recruit'&&t.sourceEvent===cause));s=advance(s);assert.equal(staff(s),original+1);const member=s.people.find(p=>p.sourceEvent===cause);assert.ok(member);assert.equal(member.salary,member.profile.salary);
 while(s.q<=contract.end&&!s.ended){if(s.pending){const option=s.pending.options.find(c=>['finish','endure','pass','decline','wait','handsOn'].includes(c.id))||s.pending.options[0];s=resolve(s,option.id);}else s=advance(s);}
 assert.equal(s.contracts.find(c=>c.id===contract.id).active,false);assert.equal(s.people.find(p=>p.id===member.id).active,true);assert.ok(costs(s)>=config.parameters.founderPay+member.salary);
});
test('同じ人数でも、失った仲間と新しい仲間を振り返る',()=>{
 const s=create(2,'A',config,'independent');const old=s.people[0];old.active=false;old.left=3;s.people.push({id:'new',name:'石井',founding:false,active:true,joined:6,salary:130});const note=reflection(s).find(n=>n.title==='同じ人数に、違う道のりで。');assert.ok(note.text.includes('佐藤')&&note.text.includes('石井'));assert.ok(note.text.includes('同じ2人'));
});
test('設定版と旧記録を保護し、終了を再実行しない',()=>{
 const s=create(1,'A',config),changed=structuredClone(config);changed.version='future';changed.parameters.overhead=80;assert.equal(s.config.parameters.overhead,45);assert.equal(create(1,'A',changed).config.version,'future');assert.throws(()=>restore(JSON.stringify({...s,model:'company-life-1'})));assert.throws(()=>validate({...config,unit:'円'}));delete changed.parameters.referralChance;assert.throws(()=>validate(changed));assert.equal(close(s).ended,'closed');assert.throws(()=>advance(close(s)));
});
