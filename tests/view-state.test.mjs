import test from 'node:test';import assert from 'node:assert/strict';
import {progressState,historyReadIntent} from '../src/domain/view-state.js';
import {create,startLife,evolveCompany,prepareTimeline,autoCanChoose,autoDecision,requestHelp} from '../src/domain/model.js';
import fs from 'node:fs';const config=JSON.parse(fs.readFileSync(new URL('../src/domain/model-data.json',import.meta.url)));
test('停止中に自動選択の予告を出さず、実際の進行状態から一つの表示を選ぶ',()=>{
 const pending={pending:true,auto:true,remaining:6000};assert.equal(progressState(pending),'一時停止');assert.equal(progressState({...pending,wanted:true,running:true}),'おまかせで返答予定');assert.equal(progressState({...pending,wanted:true,running:false}),'一時停止');assert.equal(progressState({...pending,wanted:true,auto:false}),'あなたの選択待ち');assert.equal(progressState({...pending,wanted:false,reading:true}),'一時停止 · 履歴を閲覧中');
 assert.equal(historyReadIntent({intent:false,top:100}),false);assert.equal(historyReadIntent({intent:true,top:100}),true);assert.equal(historyReadIntent({intent:true,top:0}),false);
});
test('確認付きオートは通常の資金相談・借入も止め、新規会社に移行説明を混ぜない',()=>{
 const fresh=()=>prepareTimeline(evolveCompany(startLife(create(5,'新規',config,'local'))));let s=fresh();assert.ok(!s.events.some(e=>e.text.includes('以後は0.8')||e.text.includes('過去は再計算')));
 s.pending=null;s.cash=10;s=requestHelp(s,'finance');assert.equal(autoCanChoose(s,'safe'),false);assert.throws(()=>autoDecision(s,'safe'));
 for(const type of ['finance','crisis','rescue','exit']){s.pending.type=type;assert.equal(autoCanChoose(s,'safe'),false);assert.equal(autoCanChoose(s,'all'),true);}
 const old=startLife(create(5,'旧会社',config,'local'));old.calendarMonth=14;old.q=4;const upgraded=evolveCompany(old);assert.ok(upgraded.events.some(e=>e.text.includes('以後は0.8')));
});
test('自動判断の予告は状態・乱数を進めず、再表示・保存復元後も実際の選択と一致する',async()=>{const {previewAutoChoice,restore}=await import('../src/domain/model.js');for(let seed=1;seed<=20;seed++){let s=prepareTimeline(evolveCompany(startLife(create(seed,'予告',config,'builders'))));const raw=JSON.stringify(s),planned=previewAutoChoice(s,'safe');assert.deepEqual(previewAutoChoice(s,'safe'),planned);assert.equal(JSON.stringify(s),raw);const n=autoDecision(restore(raw),'safe');assert.equal(n.autoLast.title,planned.title);assert.equal(n.decisions.at(-1).choiceId,planned.id);assert.equal(n.calendarMonth,s.calendarMonth);}const s=prepareTimeline(evolveCompany(startLife(create(3,'資金',config,'local'))));s.pending=null;s.cash=10;const help=requestHelp(s,'finance');assert.throws(()=>previewAutoChoice(help,'safe'));});
