import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Playback,displayDelay} from '../src/domain/playback.js';import {create,advance,resolve} from '../src/domain/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
function fake(){let id=0,elapsed=0;const pending=new Map(),old=[];return {pending,old,get elapsed(){return elapsed;},schedule(fn,ms){pending.set(++id,{fn,ms});old.push(fn);return id;},cancel(i){pending.delete(i);},next(){const [i,t]=pending.entries().next().value||[];if(!t)return false;pending.delete(i);elapsed+=t.ms;t.fn();return true;}};}
test('速度・停止・複数の閲覧理由を変えてもタイマーは1本、古いコールバックは無効',()=>{
 const f=fake();let ticks=0;const p=new Playback({tick:()=>ticks++,delay:v=>1800/v,schedule:f.schedule,cancel:f.cancel});p.play();const old=f.old[0];p.setSpeed(2);assert.equal(f.pending.size,1);old();assert.equal(ticks,0);f.next();assert.equal(ticks,1);p.block('details',true);p.block('modal',true);assert.equal(f.pending.size,0);p.block('details',false);assert.equal(f.pending.size,0);p.pause();p.block('modal',false);assert.equal(f.pending.size,0);p.play();f.next();assert.equal(ticks,2);p.block('decision',true);for(const callback of f.old)callback();assert.equal(ticks,2);p.dispose();
});
test('3境遇×40種のseed: 手動のまとめ進行と1期ずつの半自動進行で全会計・乱数・イベント・判断が一致',()=>{
 let manualClicks=0,autoDecisions=0;
 for(const o of config.origins)for(let seed=1;seed<=40;seed++){
 const run=step=>{let s=create(seed,'比較',config,o.id),decisions=0,clicks=0;while(!s.ended){if(s.pending){const option=s.pending.options[(seed+decisions)%s.pending.options.length].id;s=resolve(s,option);decisions++;clicks++;}else{s=advance(s,step);if(step===3)clicks++;}}delete s.batch;return {s,decisions,clicks};};
 const manual=run(3),auto=run(1);assert.deepEqual(auto.s,manual.s);manualClicks+=manual.clicks;autoDecisions+=auto.decisions;
 }assert.ok(autoDecisions<manualClicks);console.log(JSON.stringify({companies:120,manualProgressAndDecisionClicks:manualClicks,semiAutomaticDecisionClicks:autoDecisions}));
});
test('報告の種類にかかわらず一定速度、判断待ちはタイマーを開始しない',()=>{
 const s=create(1,'A',config,'local');s.q=1;s.ui={phase:'review'};s.last.profit=10;s.history=[{q:1,profit:10}];assert.equal(displayDelay(s,2),2000);assert.equal(displayDelay(s,1),4000);assert.equal(displayDelay(s,.5),8000);
 const f=fake();let calls=0;const p=new Playback({tick:()=>calls++,delay:()=>100,schedule:f.schedule,cancel:f.cancel});p.block('decision',true);p.play();p.setSpeed(2);assert.equal(f.pending.size,0);assert.equal(calls,0);
});
test('ブラウザのタイマー関数をPlaybackをthisにして呼び出さない',()=>{
 const schedule=globalThis.setTimeout,cancel=globalThis.clearTimeout;let scheduled=0,cancelled=0;
 globalThis.setTimeout=function(fn,ms){assert.equal(this,globalThis,'Windowの呼び出し元を保持する');assert.equal(ms,1800);scheduled++;return 42;};
 globalThis.clearTimeout=function(id){assert.equal(this,globalThis,'取消もWindowを呼び出し元にする');assert.equal(id,42);cancelled++;};
 try{const p=new Playback({tick(){},delay:()=>1800,now:()=>0});p.play();assert.equal(scheduled,1);p.pause();assert.equal(cancelled,1);p.play();assert.equal(scheduled,2);p.dispose();assert.equal(cancelled,2);}finally{globalThis.setTimeout=schedule;globalThis.clearTimeout=cancel;}
});
test('進行バーと同じ経過時間で停止・再開・速度変更し、残り時間から一度だけ更新する',()=>{
 let time=0,ticks=0;const tasks=new Map();let id=0;
 const p=new Playback({tick:()=>ticks++,delay:s=>1000/s,now:()=>time,schedule(fn,ms){tasks.set(++id,{fn,ms});return id;},cancel:id=>tasks.delete(id)});
 p.play();time=400;assert.equal(p.progress,.4);p.pause();time=9000;assert.equal(p.progress,.4);assert.equal(p.remaining,600);assert.equal(tasks.size,0);
 p.setSpeed(2);assert.equal(p.progress,.4);assert.equal(p.remaining,300);p.play();const [key,task]=tasks.entries().next().value;assert.equal(task.ms,300);time+=300;tasks.delete(key);task.fn();assert.equal(ticks,1);assert.equal(p.progress,0);assert.equal(tasks.size,1);p.dispose();
});
