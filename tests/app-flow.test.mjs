import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
// Fixed seed keeps playback tests independent of randomly arriving incidents.
Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(a){a[0]=123456;return a;}}});
const file=new URL('../dist/',import.meta.url),storage=new Map(),timers=new Map();let timerId=0,elapsed=0;
globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
const tick=()=>{const [id,t]=timers.entries().next().value||[];if(!t)return false;timers.delete(id);elapsed+=t.ms;t.fn();return true;};
function surface(extra={}){const listeners={};return {...extra,addEventListener(type,fn){(listeners[type]||=[]).push(fn);},emit(type,e={}){for(const fn of listeners[type]||[])fn(e);}};}
const app=surface({innerHTML:'',detailsOpen:false,querySelector(){return this.detailsOpen?{}:null;}}),modal=surface({innerHTML:'',open:false,showModal(){this.open=true;},close(){this.open=false;this.emit('close');}}),decisionModal=surface({innerHTML:'',open:false,querySelector(){return null;},showModal(){this.open=true;},close(){this.open=false;this.emit('close');}}),generic={value:'テストの会社',focus(){},scrollIntoView(){},setAttribute(){},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},getBoundingClientRect(){return {top:200-window.scrollY};},scrollTop:0,scrollHeight:1000,clientHeight:1000};
globalThis.document=surface({hidden:false,querySelector(selector){return selector==='#app'?app:selector==='#modal'?modal:selector==='#decision-modal'?decisionModal:generic;},querySelectorAll(){return [];}});
globalThis.window=surface({scrollY:0,scrollTo(x,y){this.scrollY=y;}});globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.fetch=async path=>{try{return{ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL(path,file),'utf8'))};}catch{return{ok:false};}};
function click(kind,value){app.emit('click',{target:{closest(selector){const key={action:'do',choice:'choice',origin:'origin',help:'help',speed:'speed',policy:'policy',startMode:'start-mode',archive:'archive'}[kind];return selector===`[data-${key}]`?{dataset:{[key==='start-mode'?'startMode':key]:value}}:null;}}});}
function begin(){click('action','start');assert.match(app.innerHTML,/今回めぐりあった一社/);assert.doesNotMatch(app.innerHTML,/company-pulse|playback-controls|settings/);click('action','begin-story');assert.equal((app.innerHTML.match(/class="phase"/g)||[]).length,1);assert.ok(app.innerHTML.indexOf('company-diary')<app.innerHTML.indexOf('company-pulse'));assert.ok(app.innerHTML.indexOf('id="life-feed"')<app.innerHTML.indexOf('company-pulse'));assert.doesNotMatch(app.innerHTML,/decision-overlay/);}
const get=()=>JSON.parse(storage.get('company-life-save-v3'));
await import('../dist/app.js');
test('3境遇で通常進行のクリックなしに完走し、判断時には時間を完全停止する',()=>{
 assert.match(app.innerHTML,/この会社から、始めよう/);let decisions=0;
 for(const origin of ['independent','builders','local']){click('origin',origin);begin();let i=0;const beginning=elapsed;
 while(!get().ended&&!get().checkpoint&&i++<200){const state=get();if(state.pending&&state.ui?.phase!=='review'){assert.equal(timers.size,0);const raw=JSON.stringify(state);assert.equal(tick(),false);assert.equal(JSON.stringify(get()),raw);click('choice',state.pending.options.find(a=>(a.cost<=Math.max(0,state.cash)||state.pending.type==='cyber')&&(!['hire','welcome','recruit'].includes(a.id)||!state.threads.some(t=>['join','recruit','annualRecruit'].includes(t.type)))).id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}decisions++;}else assert.equal(tick(),true);assert.equal(modal.open,false,modal.innerHTML);assert.doesNotMatch(app.innerHTML,/undefined|NaN/);assert.ok(timers.size<=1);}
 assert.ok(get().ended||get().checkpoint);assert.equal(timers.size,0);assert.match(app.innerHTML,/最後の出来事を確認して/);click('action','summary');assert.match(app.innerHTML,/あなたの会社が、経験したこと/);assert.match(app.innerHTML,/創業からの全日誌/);assert.match(app.innerHTML,/創業の日/);console.log(JSON.stringify({origin,simulatedDisplaySeconds:(elapsed-beginning)/1000,quarters:get().q,decisions:get().decisions.length}));click('action','new');click('action','archive-new');}
 assert.ok(decisions>0);
});
test('報告は自動で抜け、履歴・詳細・明示停止・非表示からの復帰を区別する',()=>{
 click('origin','builders');begin();assert.equal(get().q,0);assert.equal(get().pending.type,'inquiry');assert.match(app.innerHTML,/あなたの選択待ち/);
 click('choice','trial');click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(get().q,0);assert.equal(get().calendarMonth,0);assert.equal(get().ui.phase,'observe');assert.match(app.innerHTML,/資金/);assert.ok(timers.size===1);
 const raw=JSON.stringify(get());click('action','history');assert.equal(timers.size,0);assert.match(modal.innerHTML,/創業の日/);click('action','dismiss');assert.equal(timers.size,1);assert.equal(JSON.stringify(get()),raw);
 app.detailsOpen=true;app.emit('toggle');assert.equal(timers.size,0);click('action','toggle-play');app.detailsOpen=false;app.emit('toggle');assert.equal(timers.size,0);assert.equal(JSON.stringify(get()),raw);
 click('action','toggle-play');tick();assert.equal(get().ui.phase,'observe');assert.equal(get().calendarMonth,1);assert.equal(get().q,0);
 document.hidden=true;document.emit('visibilitychange');assert.equal(timers.size,0);document.hidden=false;document.emit('visibilitychange');assert.equal(timers.size,0);click('action','toggle-play');assert.equal(timers.size,1);click('action','toggle-play');assert.equal(timers.size,0);
});
test('停止中の速度変更で進まず、統計の出典と画面の基本要素を維持する',()=>{
 const raw=JSON.stringify(get());click('speed','2');assert.equal(timers.size,0);assert.equal(JSON.stringify(get()),raw);assert.match(app.innerHTML,/playback-controls/);click('action','data');assert.match(modal.innerHTML,/半|停止/);click('action','dismiss');assert.match(app.innerHTML,/実調査 · 2025年度/);assert.match(app.innerHTML,/公庫融資先/);assert.match(app.innerHTML,/← あなた/);assert.match(app.innerHTML,/kaigyo_251205_1.pdf/);click('action','new');click('action','archive-new');
});
test('過去の記録を読んでいる間は位置を維持し、増えた記録を新着として示す',()=>{
 click('origin','independent');begin();
 const decide=()=>{const state=get();if(state.pending){click('choice',state.pending.options.find(a=>(a.cost<=Math.max(0,state.cash)||state.pending.type==='cyber')&&(!['hire','welcome','recruit'].includes(a.id)||!state.threads.some(t=>['join','recruit','annualRecruit'].includes(t.type)))).id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}}};
 decide();generic.scrollHeight=2000;generic.clientHeight=400;generic.scrollTop=100;generic.handlers.wheel();generic.handlers.scroll();
 for(let i=0;i<3;i++){click('action','step-month');if(get().pending)break;}
 assert.equal(generic.scrollTop,100);assert.match(app.innerHTML,/新着 \d+件/);
});
test('人と取引の詳細を展開して閉じても、閲覧停止が残らない。主画面の詳細・手動停止は維持',()=>{
 if(get().pending){click('choice',get().pending.options.at(-1).id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}}
 if(timers.size===0)click('action','toggle-play');assert.equal(timers.size,1);
 const summary={currentTarget:modal,target:{closest:selector=>selector==='summary'?{}:null}};
 for(let i=0;i<2;i++){click('action','relationships');assert.equal(timers.size,0);modal.emit('click',summary);modal.emit('click',summary);click('action','dismiss');assert.equal(timers.size,1);}
 app.detailsOpen=true;app.emit('toggle');click('action','relationships');modal.emit('click',summary);click('action','dismiss');assert.equal(timers.size,0);app.detailsOpen=false;app.emit('toggle');assert.equal(timers.size,1);
 click('action','toggle-play');click('action','relationships');modal.emit('click',summary);modal.close();assert.equal(timers.size,0);click('action','toggle-play');assert.equal(timers.size,1);click('action','toggle-play');
});

test('備えの登録と観測終了・続行が画面からつながり、判断で月を進めない',()=>{
 click('action','new');click('action','archive-new');click('origin','independent');begin();
 if(get().pending){click('choice',get().pending.options.at(-1).id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}}
 const month=get().calendarMonth;click('action','policies');assert.equal(timers.size,0);assert.match(modal.innerHTML,/バックアップ/);click('policy','backup');assert.equal(get().life.backup,true);assert.equal(get().calendarMonth,month);assert.equal(modal.open,false);
 click('action','close-company');assert.equal(get().pending.type,'exit');assert.equal(timers.size,0);click('choice','suspend');click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(get().ended,null);assert.equal(get().suspended,true);assert.equal(get().calendarMonth,month);assert.equal(timers.size,0);click('action','summary');assert.match(app.innerHTML,/会社：継続/);assert.match(app.innerHTML,/この会社を続ける/);click('action','continue-life');assert.equal(get().ended,null);assert.equal(get().calendarMonth,month);assert.equal(timers.size,1);click('action','toggle-play');
});
test('家族候補の記録・方針・準備・世代交代後の進行まで画面でつながる',()=>{
 click('action','new');click('action','archive-new');click('origin','independent');begin();if(get().pending){click('choice',get().pending.options.at(-1).id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}}
 click('action','family-form');click('action','family-add');assert.equal(get().life.family.length,1);click('action','leadership');click('choice',get().life.family[0].id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(get().pending.type,'handover');click('choice','maintain');click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(get().calendarMonth,0);
 for(let guard=0;get().calendarMonth<13&&guard<80;guard++){const state=get();if(state.pending){const a=state.pending.options.find(a=>['maintain','wait','pass','decline','expert','collect','rescueLoan'].includes(a.id)&&a.cost<=Math.max(0,state.cash))||state.pending.options.at(-1);click('choice',a.id);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}}else assert.equal(tick(),true);assert.equal(modal.open,false,modal.innerHTML);assert.doesNotMatch(app.innerHTML,/undefined|NaN/);}
 assert.equal(get().life.generations.length,2);assert.equal(get().ended,null);assert.match(app.innerHTML,/第2代/);assert.equal(get().calendarMonth,13);click('action','generations');assert.match(modal.innerHTML,/引継ぎ時/);click('action','dismiss');click('action','save-pause');assert.equal(timers.size,0);click('action','dismiss');assert.equal(timers.size,0);
});

test('過去ログへスクロールすると停止し、最新へ戻るだけでは再開せず1か月だけ進められる',()=>{
 click('action','new');click('action','archive-new');click('origin','builders');begin();click('choice','pass');click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(timers.size,1);
 generic.scrollHeight=2000;generic.clientHeight=400;generic.scrollTop=100;generic.handlers.scroll();assert.equal(timers.size,1,'配置更新のscrollだけでは停止しない');generic.handlers.wheel();generic.handlers.scroll();assert.equal(timers.size,0);const before=get().calendarMonth;
 click('action','latest');assert.equal(timers.size,0);click('action','step-month');assert.equal(get().calendarMonth,before+1);assert.equal(timers.size,0);
 click('action','resume-latest');assert.equal(timers.size,1);click('action','toggle-play');assert.equal(timers.size,0);
});
const clockPauseForTest=()=>click('action','toggle-play');
const setting=(name,value)=>app.emit('change',{target:{dataset:{setting:name},value}});
test('おまかせは6秒の相談表示後に判断し、通常月は一定間隔。選択への介入・詳細で停止する',()=>{
 click('action','new');click('action','archive-new');click('origin','builders');begin();const before=get().calendarMonth;
 setting('auto','safe');setting('speed','.125');assert.equal(timers.size,1);assert.ok(Math.abs([...timers.values()][0].ms-6000)<50);tick();assert.equal(get().calendarMonth,before);assert.ok(get().autoLast);assert.ok(get().events.some(e=>e.auto));
 assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,5000);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);tick();assert.ok(Math.abs([...timers.values()][0].ms-32000)<50);tick();assert.equal(get().calendarMonth,before+1);
 click('action','history');assert.equal(timers.size,0);click('action','dismiss');assert.equal(timers.size,1);
 // Self-initiated interventions must wait even in auto mode.
 click('help','workload');assert.equal(timers.size,0);click('choice','adjust');click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(timers.size,1);assert.equal(get().calendarMonth,before+1);clockPauseForTest();
 click('action','toggle-play');assert.equal(timers.size,1);click('action','close-company');assert.equal(get().pending.type,'exit');assert.equal(timers.size,0);
 setting('auto','all');assert.equal(timers.size,1);click('choice','stay');assert.equal(timers.size,0);click('action','decide');if(get().decisionReceipt){assert.equal(timers.size,0);assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);click('action','continue-result');}assert.equal(timers.size,1);setting('auto','manual');
});
test('判断モーダルは背景・Escapeで消えず、結果は同じ月で停止し二重確定を防ぐ',()=>{
 setting('auto','manual');click('action','new');click('action','archive-new');click('origin','builders');begin();
 const month=get().calendarMonth;assert.equal(decisionModal.open,true);assert.match(decisionModal.innerHTML,/あなたの選択待ち/);
 let prevented=false;decisionModal.emit('cancel',{preventDefault(){prevented=true;}});assert.equal(prevented,true);decisionModal.emit('click',{target:{closest(){return null;}}});assert.equal(decisionModal.open,true);assert.equal(timers.size,0);
 click('choice','trial');click('action','decide');const receipt=get();assert.equal(receipt.calendarMonth,month);assert.ok(receipt.decisionReceipt);assert.ok(receipt.decisionReceipt.future.some(x=>x.includes('試作')&&x.includes('3月末')));assert.match(decisionModal.innerHTML,new RegExp(receipt.decisionReceipt.action));assert.match(decisionModal.innerHTML,/これから届くこと/);assert.equal(tick(),false);
 click('action','decide');assert.deepEqual(get(),receipt);click('action','step-month');assert.deepEqual(get(),receipt);
 click('action','continue-result');assert.equal(decisionModal.open,false);assert.equal(get().calendarMonth,month);assert.equal(timers.size,1);click('action','toggle-play');
});
test('採用の判断は当月終了の案件と将来受注を示し、静かな月に過去の主カードを残さない',()=>{
 click('help','workload');assert.match(decisionModal.innerHTML,/青葉製作所：180万円／期、1年目 3月末まで/);assert.match(decisionModal.innerHTML,/次期の受注目安/);assert.doesNotMatch(decisionModal.innerHTML,/採用・入社待ちなし/);click('action','cancel-help');
 click('action','step-month');assert.match(app.innerHTML,/1年目 1月末 · 次の決算まで2か月/);assert.doesNotMatch(app.innerHTML,/今回の変化なし|いつもの仕事を重ねています/);assert.doesNotMatch(app.innerHTML,/quiet-calendar|current-scene|class="life-feed"/);assert.match(app.innerHTML,/会社の日誌/);const records=[...app.innerHTML.matchAll(/data-record="([^"]+)"/g)].map(m=>m[1]);assert.equal(records.length,new Set(records).size,'同じ出来事は通常画面内に一度だけ表示');
});
test('新規開始前に引き継いだモードを示し、記録を保存して会社を切り替えられる',()=>{
 const prior=get();setting('auto','safe');click('action','company');assert.match(modal.innerHTML,/別の会社を始める/);click('action','new');assert.match(modal.innerHTML,/廃業しません/);assert.equal(timers.size,0);click('action','dismiss');assert.deepEqual(get(),prior);
 click('action','new');click('action','archive-new');const saved=JSON.parse(storage.get('company-life-archives-v1')).find(a=>JSON.parse(a.raw).name===prior.name&&a.raw===JSON.stringify(prior));assert.ok(saved);click('action','start');assert.match(app.innerHTML,/今回の操作：<b>おまかせ/);assert.equal(timers.size,0);assert.equal(tick(),false);click('origin','builders');click('startMode','manual');assert.match(app.innerHTML,/自分で決めながら始める/);click('action','begin-story');assert.equal(timers.size,0);assert.equal(get().pending.type,'inquiry');
 click('archive',saved.id);assert.equal(get().calendarMonth,prior.calendarMonth);assert.equal(get().rng,prior.rng);assert.equal(timers.size,0);
});
test('別会社の保存に失敗した場合は、現在の会社を消さず停止する',()=>{
 const prior=get(),write=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key==='company-life-archives-v1')throw Error('容量不足');write(key,value);};
 // A same-month snapshot may already exist. Advance once to create a distinct record.
 click('action','step-month');const current=get();click('action','new');click('action','archive-new');assert.match(modal.innerHTML,/保存できませんでした/);assert.deepEqual(get(),current);assert.equal(timers.size,0);localStorage.setItem=write;click('action','dismiss');
});
test('相談を畳んでいる間はオートでも進まず、再表示して開いた説明と位置を保つ',()=>{
 click('action','new');click('action','archive-new');click('origin','builders');begin();setting('auto','safe');const before=get();assert.equal(timers.size,1);click('action','hold-decision');assert.equal(timers.size,0);assert.equal(tick(),false);click('action','reopen-decision');assert.equal(timers.size,1);
 const query=decisionModal.querySelector,queries=decisionModal.querySelectorAll;const body={scrollTop:180},detail={open:true,dataset:{detail:'risk-trial'}};
 decisionModal.querySelector=selector=>selector==='.decision-body'?body:selector==='details[open]'&&detail.open?detail:null;
 decisionModal.querySelectorAll=selector=>selector==='details[open]'?(detail.open?[detail]:[]):selector==='details'?[detail]:[];
 const html=decisionModal.innerHTML;click('choice','trial');assert.equal(decisionModal.innerHTML,html,'選択だけではモーダルDOMを交換しない');assert.equal(detail.open,true);assert.equal(body.scrollTop,180);
 click('action','hold-decision');assert.equal(decisionModal.open,false);assert.equal(timers.size,0);assert.equal(tick(),false);assert.match(app.innerHTML,/判断保留 · 時間は停止中/);click('action','step-month');assert.equal(get().calendarMonth,before.calendarMonth);
 click('action','company');click('action','dismiss');assert.equal(timers.size,0);click('action','reopen-decision');assert.equal(decisionModal.open,true);assert.equal(detail.open,true);assert.equal(body.scrollTop,180);assert.equal(decisionModal.innerHTML,html);
 click('action','decide');assert.ok(get().decisionReceipt);assert.equal(get().calendarMonth,before.calendarMonth);decisionModal.querySelector=query;decisionModal.querySelectorAll=queries;click('action','continue-result');setting('auto','manual');
});
test('軽い見送りは一度で記録し、同月のまま日常へ戻る',()=>{
 click('action','new');click('action','archive-new');click('origin','builders');begin();const before=get();assert.match(decisionModal.innerHTML,/即時返答/);click('choice','pass');const after=get();assert.equal(after.calendarMonth,before.calendarMonth);assert.equal(after.decisions.length,before.decisions.length+1);assert.equal(after.decisionReceipt,undefined);assert.equal(decisionModal.open,false);assert.equal(timers.size,1);assert.match(app.innerHTML,/返答を記録しました/);click('choice','pass');assert.equal(get().decisions.length,after.decisions.length);click('action','toggle-play');
});
test('一覧から経緯を読んで戻ると、一覧・位置・操作対象と停止を保つ',()=>{
 click('action','relationships');const list=modal.innerHTML;modal.scrollTop=240;let focused=0;document.activeElement={focus(){focused++;}};
 const id=get().events[0].id;modal.emit('click',{target:{closest:selector=>selector==='[data-event]'?{dataset:{event:id}}:null}});
 assert.match(modal.innerHTML,/前の画面へ戻る/);assert.equal(modal.scrollTop,0);assert.equal(timers.size,0);
 click('action','dismiss');assert.equal(modal.open,true);assert.equal(modal.innerHTML,list);assert.equal(modal.scrollTop,240);assert.equal(focused,1);assert.equal(timers.size,0);
 click('action','dismiss');assert.equal(modal.open,false);document.activeElement=null;
});
test('自動フォーカスは進行を止めず、Tabで自動判断を止め、手動説明を表示する',()=>{
 click('action','new');click('action','archive-new');click('origin','builders');begin();setting('auto','safe');assert.equal(timers.size,1);
 decisionModal.emit('focusin',{target:{}});assert.equal(timers.size,1);
 const originalQuery=decisionModal.querySelector,pauseButton={textContent:'一時停止'};decisionModal.querySelector=selector=>selector==='[data-do="decision-pause"]'?pauseButton:originalQuery(selector);
 const before=get();decisionModal.emit('keydown',{key:'Tab',target:{closest:()=>null}});assert.equal(timers.size,0);assert.equal(tick(),false);assert.deepEqual(get(),before);assert.equal(pauseButton.textContent,'再開');click('action','decision-pause');assert.equal(pauseButton.textContent,'一時停止');decisionModal.emit('pointerdown',{target:{closest:()=>true}});assert.equal(pauseButton.textContent,'再開');assert.equal(timers.size,0);decisionModal.querySelector=originalQuery;
 click('action','hold-decision');assert.equal((app.innerHTML.match(/held-decision/g)||[]).length,0);click('action','play-settings');assert.match(modal.innerHTML,/相談を保留中/);assert.doesNotMatch(modal.innerHTML,/相談は6秒/);click('action','dismiss');click('action','reopen-decision');
 setting('auto','manual');click('action','play-settings');assert.match(modal.innerHTML,/選ぶまで時間は停止/);assert.doesNotMatch(modal.innerHTML,/相談は6秒/);click('action','dismiss');click('choice','pass');click('action','toggle-play');
});
test('取引と体制の維持は一度で返答し、費用・年月を変えず日常へ戻る',()=>{
 click('action','strategy');assert.equal(get().pending.type,'strategy');const before=get();click('choice','maintain');assert.equal(get().decisionReceipt,undefined);assert.equal(get().calendarMonth,before.calendarMonth);assert.equal(get().cash,before.cash);assert.equal(decisionModal.open,false);assert.match(app.innerHTML,/返答を記録しました：今ある取引と体制を維持する/);click('action','toggle-play');
});
test('上部と設定の倍率は、どちらから変更しても選択状態と保存値が同時に変わる',()=>{
 const query=document.querySelectorAll;const controls=[.125,.25,.5,1,2,.125,.25,.5,1,2].map(speed=>({dataset:{speed:String(speed)},setAttribute(key,value){this[key]=value;}}));document.querySelectorAll=selector=>selector==='[data-speed]'?controls:[];
 click('action','play-settings');click('speed','1');assert.equal(JSON.parse(storage.get('company-life-preferences-v1')).speed,1);assert.equal(controls.filter(b=>b['aria-pressed']==='true').length,2);assert.ok(controls.filter(b=>b['aria-pressed']==='true').every(b=>b.dataset.speed==='1'));click('action','dismiss');click('speed','.5');assert.ok(controls.filter(b=>b['aria-pressed']==='true').every(b=>b.dataset.speed==='.5'||b.dataset.speed==='0.5'));document.querySelectorAll=query;
});
test('速度と選択モードを保存し、再読み込み後も速度を保持して停止状態から始まる',async()=>{
 setting('speed','.125');setting('auto','safe');assert.deepEqual(JSON.parse(storage.get('company-life-preferences-v1')),{speed:.125,auto:'safe'});
 click('help','workload');click('choice','adjust');click('action','decide');assert.ok(get().decisionReceipt);const receipt=get().decisionReceipt;assert.equal(timers.size,0);
 await import('../dist/app.js?reload09');assert.deepEqual(get().decisionReceipt,receipt);assert.match(decisionModal.innerHTML,/id="decision-title"/);assert.doesNotMatch(decisionModal.innerHTML,/即時変化はありません|新しい予定はありません/);assert.equal(decisionModal.open,true);assert.equal(timers.size,0);assert.match(app.innerHTML,/data-speed="0.125" aria-pressed="true">0.5×/);assert.match(app.innerHTML,/重要判断は確認 · 設定/);
});
