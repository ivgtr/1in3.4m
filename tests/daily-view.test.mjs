import test from 'node:test';import assert from 'node:assert/strict';import {eventDigest,discoveryAssignments} from '../src/domain/daily-view.js';
test('短い記録は実在する人物と過去の縁だけを使い、状態も乱数も変えない',()=>{const a={id:'a',month:1,kind:'choice',title:'小林を迎えることにした。',entities:['p']},b={id:'b',month:4,kind:'turning',title:'入社した。',entities:['p'],causes:['a']},future={id:'c',month:8,title:'小林が退職した。',entities:['p']};const s={people:[{id:'p',name:'小林',founding:false}],clients:[],contacts:[],events:[a,b,future],rng:123};const before=JSON.stringify(s),d=eventDigest(s,b);assert.equal(d.title,'入社した。');assert.deepEqual(d.participants,['小林']);assert.equal(d.previous.id,'a');assert.equal(d.significant,true);assert.deepEqual(d.founders,[]);assert.equal(JSON.stringify(s),before);assert.equal(eventDigest(s,{...b,id:'absent',entities:[]}).previous,undefined);});
test('統計は同じ課題ごとに初回へ割り当て、普通の月や繰り返す事件へ増やさない',()=>{const s={events:[{id:'start',kind:'start'},{id:'h1',kind:'choice'},{id:'h2',kind:'choice'},{id:'c1',topic:'cyber'},{id:'c2',topic:'cyber'}],decisions:[{eventId:'h1',choiceId:'recruit'},{eventId:'h2',choiceId:'recruit'}],people:[],life:{incidents:[{eventId:'c1'},{eventId:'c2'}]}};const before=JSON.stringify(s);assert.deepEqual([...discoveryAssignments(s)], [['h1','hiring'],['start','start'],['c1','cyber']]);assert.equal(JSON.stringify(s),before);});

test('社員が関連していても借入の行為者にせず、旧記録の不成立と契約規模を短く明示する',()=>{
 const loan={id:'loan',kind:'choice',topic:'finance',title:'運転資金を300万円借りる',entities:['p'],text:'借入も300万円増える。'};
 const lost={id:'lost',kind:'ordinary',topic:'client',title:'森川工務店との試作は、ひとまずここまで。',text:'納品の売上は残ったが、今回は継続契約に至らなかった。'};
 const large={id:'large',kind:'turning',topic:'contract',title:'みなと印刷の大口開発が、会社の日常に加わった。',text:'毎期267万円分、4四半期の仕事。今の体制で担当する。'};
 const s={people:[{id:'p',name:'池田'}],events:[loan,lost,large],decisions:[{eventId:'loan',choiceId:'borrow'}]},raw=JSON.stringify(s);
 assert.equal(eventDigest(s,loan).title,'会社が運転資金300万円を借りた。');assert.deepEqual(eventDigest(s,loan).participants,['池田']);
 assert.equal(eventDigest(s,lost).title,'森川工務店との試作期間が終了。継続契約には至らなかった。');assert.equal(eventDigest(s,large).scale,'大口受注 · 267万円／期 · 1年間');
 assert.equal(eventDigest(s,{...lost,text:'結果は未記録'}).title,lost.title,'根拠がなければ不成立を補わない');assert.equal(JSON.stringify(s),raw);
});

test('紹介交渉の要約は相手・紹介元・回答時期を保存記録からつなぐ',()=>{
 const e={id:'e',title:'継続契約を提案する',text:'交渉を開始。1か月後に回答が届きます。',topic:'inquiry',kind:'choice'};
 const state={events:[e],clients:[{id:'source',name:'みなと印刷'}],contacts:[{id:'lead',name:'北町の旅館',sourceId:'source'}],decisions:[{eventId:'e',type:'inquiry',choiceId:'negotiate',entityId:'lead'}]};
 const raw=JSON.stringify(state);assert.equal(eventDigest(state,e).title,'みなと印刷の紹介で、北町の旅館に継続契約を提案した。回答は翌月。');assert.equal(JSON.stringify(state),raw);
 state.contacts[0].sourceId=null;assert.doesNotMatch(eventDigest(state,{...e,text:''}).title,/紹介|翌月/);
});
test('日誌は同じ月の記録をまとめ、無変化の月を作らない',async()=>{const {diaryMonths}=await import('../src/domain/daily-view.js');const records=[{id:'a',month:5},{id:'b',month:5},{id:'c',month:2}];assert.deepEqual(diaryMonths(records),[{month:5,records:records.slice(0,2)},{month:2,records:records.slice(2)}]);});
test('承継の比較は各経営者の初回振り返りに残し、毎年は繰り返さない',()=>{const state={events:[{id:'a',topic:'generationReview',causes:['first']},{id:'b',topic:'generationReview',causes:['first']},{id:'c',topic:'generationReview',causes:['second']}],decisions:[],people:[],life:{incidents:[]}};assert.deepEqual([...discoveryAssignments(state)],[['a','succession'],['c','succession']]);});
