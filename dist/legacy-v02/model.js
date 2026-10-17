export const MODEL = 'company-life-2';
export const round = n => Math.round(n * 100) / 100;
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const sum = a => round(a.reduce((x,y)=>x+y,0));
export function rng(s) { s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; }
const pick = (s,a) => a[Math.floor(rng(s)*a.length)];
const between = (s,a,b) => round(a+rng(s)*(b-a));
const uid = (s,prefix) => `${prefix}${++s.serial}`;
export function validate(c) {
  if(c.unit!=='万円 / 四半期'||!c.version||c.scope!=='架空の小規模受託ソフトウェア会社・創業5年以内')throw Error('設定の単位・版・対象が不正です');
  for(const key of ['founderPay','employeePay','overhead','capacityPerPerson','collectionShare','quarterlyInterest','quarterlyPrincipal','hireChance','delayChance','departureChance','salesChance','contractionChance','macroStay','referralChance','offerChance','pipelineChance','additionChance','trialConversionChance','underbookedPipelineChance']) {
    const n=c.parameters[key];if(!Number.isFinite(n)||n<0)throw Error(`設定値が欠測または不正: ${key}`);
    if(/Chance$|Share$|Stay$|Interest$/.test(key)&&n>1)throw Error(`割合の範囲が不正: ${key}`);
  }
  if(!Array.isArray(c.origins)||c.origins.length!==3)throw Error('創業条件が不足しています');
  for(const o of c.origins){for(const k of ['cash','experience'])if(!Array.isArray(o[k])||o[k].length!==2||!o[k].every(Number.isFinite)||o[k][0]>o[k][1])throw Error('創業条件の範囲が不正');if(!Number.isFinite(o.fixed)||!Number.isFinite(o.debt)||!Number.isFinite(o.skill)||o.skill<=0||!Number.isFinite(o.teamSalary)||!Array.isArray(o.team)||!Array.isArray(o.clients))throw Error('創業条件が不正');}
  return c;
}
export const activeTeam=s=>s.people.filter(p=>p.active);
export const activeClients=s=>s.clients.filter(c=>c.active);
export const staff=s=>activeTeam(s).length;
export const costs=s=>round(s.config.parameters.founderPay+sum(activeTeam(s).map(p=>p.salary))+s.fixed);
export const receivables=s=>sum(s.receivables.map(r=>r.amount));
export const clientWork=(s,c)=>c.value+sum(s.contracts.filter(p=>p.active&&p.clientId===c.id).map(p=>p.value));
export const concentration=s=>{const amounts=activeClients(s).map(c=>clientWork(s,c)),total=sum(amounts);return total?Math.max(...amounts)/total:0;};
export const chapter=s=>staff(s)>=3?'仲間と任せ合う会社':s.style==='companion'?'長く伴走する会社':s.clients.filter(c=>c.active&&s.q-c.since>=8).length?'続けてきた約束':activeClients(s).length>=3?'仕事がつながる頃':!activeClients(s).length?'最初の信頼を探して':'小さな会社のはじまり';
export function emit(s,kind,title,text,{entities=[],causes=[],major=true,topic='company'}={}) {
 const e={id:uid(s,'e'),q:s.q,kind,title,text,entities,causes,major,topic};s.events.push(e);return e;
}
function person(s,name,founding=false,cause=null){const p={id:uid(s,'p'),name,role:founding?'創業メンバー':'開発メンバー',active:true,founding,joined:s.q,left:null,sourceEvent:cause,salary:founding?s.origin.teamSalary:s.config.parameters.employeePay};s.people.push(p);return p;}
function client(s,name,value,{relation=50,sourceEvent=null,sourceId=null}={}){const c={id:uid(s,'c'),name,value:round(value),relation,active:true,since:s.q,sourceEvent,sourceId,renewed:false};s.clients.push(c);return c;}
function candidate(s){return pick(s,['高橋','石井','中村','小林','山田','清水','松本','加藤','阿部','森','池田','岡田'].filter(n=>!s.people.some(p=>p.name===n)&&!s.threads.some(t=>t.name===n)))||`紹介の開発者${s.serial}`;}
function contact(s,name,{sourceId=null,sourceEvent=null,quality=1}={}){const c={id:uid(s,'l'),name,sourceId,sourceEvent,status:'available',quality,created:s.q};s.contacts.push(c);return c;}
export function create(seed,name,config,originId) {
 validate(config);const s={model:MODEL,config:structuredClone(config),seed:seed>>>0,rng:seed>>>0,name:name||'こもれびソフト',serial:0,q:0,cash:0,debt:0,fixed:0,experience:0,skill:1,fatigue:0,trust:55,macro:1,backlog:0,receivables:[],people:[],clients:[],contacts:[],contracts:[],threads:[],events:[],decisions:[],history:[],cooldowns:{},flags:{},pending:null,scannedQuarter:0,batch:[],style:'open',ended:null};
 const drawn=pick(s,config.origins);const o=originId?config.origins.find(o=>o.id===originId):drawn;if(!o)throw Error('知らない創業条件');s.originId=o.id;s.origin=structuredClone(o);s.cash=between(s,...o.cash);s.debt=o.debt;s.fixed=o.fixed;s.experience=Math.floor(between(s,...o.experience));s.macro=pick(s,[0,1,1,2]);s.skill=o.skill;
 for(const name of o.team)person(s,name,true);for(const c of o.clients)client(s,c.name,between(s,...c.value),{relation:c.relation});
 s.initial={cash:s.cash,debt:s.debt,staff:staff(s),experience:s.experience,clients:structuredClone(s.clients),people:structuredClone(s.people),fixed:s.fixed,originId:o.id};
 emit(s,'start',o.headline,o.description,{entities:[...s.people.map(p=>p.id),...s.clients.map(c=>c.id)],topic:'origin'});
 if(o.id==='builders'){const e=s.events[0];contact(s,'八木編集室',{sourceEvent:e.id,quality:.9});}
 s.last={revenue:0,profit:0,load:0,deltaCash:0,events:[s.events[0]]};return s;
}
const choice=(id,title,cost,desc,effect)=>({id,title,cost,desc,effect});
function decision(s,type,title,text,entityId,options,causes=[]){const d={id:uid(s,'d'),type,title,text,entityId,at:s.q+1,options,causes};s.pending=d;s.cooldowns.decision=s.q+2;return true;}
function discover(s){
 if(s.scannedQuarter===s.q+1||s.ended)return false;s.scannedQuarter=s.q+1;
 const p=s.config.parameters,team=activeTeam(s),clients=activeClients(s),reserve=costs(s);
 if(s.cash<reserve*1.3&&s.q>=(s.cooldowns.crisis||0)){
   s.cooldowns.crisis=s.q+3;const opts=[];
   if(s.debt<=900)opts.push(choice('borrow','時間を買うため、300万円を借りる',0,'借入 +300万円。今期の支払いに充てる。','利息と元本返済が続く。仕事が増える保証はない。'));
   if(team.length)opts.push(choice('reduce',`${team.at(-1).name}と別れ、体制を縮める`,45,'整理費45万円。今期から対象の仲間の給与を削減。','仕事の処理能力も失う。後から同じ仲間を補充はできない。'));
   opts.push(choice('endure','今ある仕事を納め、回収を待つ',0,'新しい支出を増やさず、この3か月を進める。','期末に現金が不足すれば、会社は継続できない。'));
   return decision(s,'crisis','次の支払いまで、あまり時間がない。',`手元資金は${Math.round(s.cash)}万円。通常の四半期費用は約${Math.round(reserve)}万円。${receivables(s)?`入金待ちの${Math.round(receivables(s))}万円もあるが、まだ現金ではない。`:'これからの受注だけで支払いを賄えるかは分からない。'}`,team.at(-1)?.id||null,opts,s.events.filter(e=>e.kind==='risk').slice(-2).map(e=>e.id));
 }
 if(s.q<(s.cooldowns.decision||0))return false;
 if(s.fatigue>62&&team.length&&s.q>=(s.cooldowns.team||0)){
 const member=team.find(p=>p.founding)||team[0];s.cooldowns.team=s.q+5;return decision(s,'team',`${member.name}が、働き方を相談してきた。`,'仕事があるのはありがたい。でも、今のペースをずっと続けるのは難しい。会社が続くことと、仲間が続けられることは、同じではない。',member.id,[choice('relieve','仕事の量を減らし、一緒に続ける',20,'調整費20万円。疲労 −35、今期の受注量 −15%。','いったん売上の機会を減らす。'),choice('release','別の道を尊重し、送り出す',45,'整理費45万円。今期から給与と処理能力が1人分減る。','その人と働いた記録は、この会社に残る。')],s.events.filter(e=>e.topic==='workload').slice(-1).map(e=>e.id));
 }
 if(team.length>=3&&!s.flags.delegation){const member=team[0];return decision(s,'delegation',`${member.name}に、仕事の一部を任せる？`,'仲間が増えたのに、確認も顧客対応も創業者に集まっている。開発する会社から、人を任せ合う会社へ進む節目かもしれない。',member.id,[choice('delegate',`${member.name}を、開発のまとめ役にする`,45,'引継ぎ費45万円。2期後に処理倍率 +0.10、疲労を軽減。','これからは、仲間に任せて進める会社になる。'),choice('handsOn','自分が現場を引っ張り続ける',0,'追加費用なし。処理倍率 +0.05、疲労 +12。','今は仕事を増やせるが、負担は創業者に残る。')],team.filter(p=>p.sourceEvent).slice(-1).map(p=>p.sourceEvent));}
 const veteran=clients.find(c=>s.q-c.since>=7&&c.relation>=60&&!c.renewed);
 if(veteran&&team.length<=1&&s.q>=7){return decision(s,'relationship',`${veteran.name}から、「これからも」の相談。`,'新しい会社ではなく、日々の業務を知るあなたたちに頼みたい。小さいまま積み重ねた時間にも、次の形がある。',veteran.id,[choice('companion','長く伴走する、保守契約へ進む',20,'調整費20万円。この顧客の基準受注 +15%、信頼が深まる。','新しい大口案件の相談は減るが、少人数で続く道が開く。'),choice('explore','関係は守りつつ、新しい分野も探す',25,'開拓費25万円。この顧客との契約額は維持。','つながりを頼りに紹介を待つ。新規契約は保証されない。')],[veteran.sourceEvent].filter(Boolean));}
 const expiring=s.contracts.find(c=>c.active&&c.end===s.q+1&&c.kind==='large'&&!c.renewalConsidered);
 if(expiring){const c=s.clients.find(c=>c.id===expiring.clientId);expiring.renewalConsidered=true;return decision(s,'renewal',`${c.name}の大口案件が、一区切りを迎える。`,`${expiring.duration}四半期続いた開発が終わる。${expiring.hireSource&&s.people.some(p=>p.sourceEvent===expiring.sourceEvent&&p.active)?'あの受注をきっかけに迎えた仲間の給与は、その後も続く。':'次の仕事を引き受けるか、いったん余白をつくるか。'}`,expiring.id,[choice('maintenance','保守契約を引き受け、関係を残す',15,'調整費15万円。案件終了後、この顧客の毎期受注 +70万円。','大口開発ほどの売上にはならない。'),choice('finish','開発で区切り、新しい仕事を探す',0,'追加支出なし。大口案件は予定どおり終了。','空いた能力を別の案件に使えるが、受注は未定。')],[expiring.sourceEvent]);}
 const available=s.contacts.find(c=>c.status==='available');
 if(available){const source=available.sourceId?s.clients.find(c=>c.id===available.sourceId)||s.contacts.find(c=>c.id===available.sourceId):null;return decision(s,'inquiry',`${available.name}から、小さな開発の相談。`,`${source?`${source.name}とのつながりから届いた話。`:'実績を聞きつけて届いた、はじめての相談。'}まずは短い試作から、と言われている。`,available.id,[choice('trial','小さく引き受け、信頼をつくる',10,'準備費10万円。今期180万円分の試作を受注。','納品できれば継続契約につながることがある。'),choice('negotiate','継続契約を条件に、交渉する',15,'打ち合わせ費15万円。毎期200万円規模を提案。','成約は未確定。失注しても、会った相手は記録に残る。'),choice('pass','今回は見送り、今の仕事を守る',0,'受注せず、相手との連絡先だけを残す。','仕事は増えない。後日、別の紹介が届く可能性もある。')],[available.sourceEvent].filter(Boolean));}
 if(clients.length&&s.q>=(s.cooldowns.offer||0)&&s.style!=='companion'&&rng(s)<p.offerChance){
 const c=pick(s,clients),value=Math.round(between(s,180,300)),duration=pick(s,[2,3,4]);s.cooldowns.offer=s.q+4;
 const d=decision(s,'large',`${c.name}から、今までより大きな相談。`,`${duration}四半期のあいだ、毎期${value}万円分の追加開発。今の仕事に重なる。受注をきっかけに、人を増やすか、外の力を借りるか。`,c.id,[choice('hire','受ける。そして、一緒に働く仲間を探す',35,'採用活動35万円。採用できれば翌期から給与130万円/期。','採用前も案件は始まる。案件が終わっても給与は残る。'),choice('partner','外部の開発者と組んで、受ける',0,'案件が動く各期に外注90万円。処理能力 +180万円分。','初期活動費なし。外注費は案件期間中、毎期支払う。'),choice('decline','今の約束を守るため、見送る',0,'追加支出なし。既存の仕事は通常どおり続く。','この売上は得られない。相談した相手との縁は残る。')],[c.sourceEvent].filter(Boolean));s.pending.value=value;s.pending.duration=duration;return d;
 }
 if((s.last.load>1.1||s.fatigue>40)&&team.length<5&&s.cash>reserve&&s.q>=(s.cooldowns.hiring||0)){
 s.cooldowns.hiring=s.q+4;const name=s.flags.candidateName||candidate(s);delete s.flags.candidateName;return decision(s,'hiring',`仕事が増えるなか、${name}との縁がつながった。`,'経験のある開発者が、あなたの会社を気にかけている。仕事が多い今は助かる。でも、次の季節まで同じ受注があるかは分からない。',null,[choice('welcome',`${name}を仲間に迎える`,35,'採用準備35万円。翌期から1人増員、給与130万円/期。','内定承諾済み。給与は受注が減っても発生する。'),choice('wait','今の体制で続け、連絡先を残す',0,'費用・人数は変わらない。','後から同じ人を採用できるとは限らない。')]);}
 return false;
}
const customerNames=['田辺食品','波止場デザイン','森川工務店','ひだまり出版','青葉物流','三浦商店','北町の旅館','吉田製作所'];
function newName(s){return pick(s,customerNames.filter(n=>!s.clients.some(c=>c.name===n)&&!s.contacts.some(c=>c.name===n)))||`紹介の事業者${s.serial}`;}
function followup(s,sourceId,sourceEvent){s.threads.push({id:uid(s,'t'),type:'referral',due:s.q+pick(s,[2,3,4]),sourceId,sourceEvent});}
function apply(s,d,id){const a=d.options.find(a=>a.id===id);if(!a)throw Error('この局面では選べません');const r={special:a.cost,borrow:0,lowerDemand:1},entities=[d.entityId].filter(Boolean);const de=emit(s,'choice',a.title,`${d.title} ${a.desc}`,{entities,causes:d.causes,topic:d.type});s.decisions.push({id:d.id,q:s.q,type:d.type,prompt:d.title,choiceId:id,choice:a.title,description:a.desc,eventId:de.id,entityId:d.entityId});
 if(d.type==='crisis'){
 if(id==='borrow'){r.borrow=300;s.debt+=300;emit(s,'turning','会社を続けるための、時間を借りた。','300万円が入金された。借入であり、売上や利益ではない。',{causes:[de.id],topic:'finance'});}
 if(id==='reduce'){const member=s.people.find(p=>p.id===d.entityId);leave(s,member,de.id,'資金を守るため');}
 }
 if(d.type==='inquiry'){
 const lead=s.contacts.find(c=>c.id===d.entityId);lead.status=id==='pass'?'passed':id==='trial'?'trial':'negotiating';lead.decisionEvent=de.id;
 if(id==='trial') {const c=client(s,lead.name,0,{sourceEvent:de.id,sourceId:lead.id});lead.clientId=c.id;s.contracts.push({id:uid(s,'k'),clientId:c.id,value:180,start:s.q,end:s.q,active:true,kind:'trial',sourceEvent:de.id,leadId:lead.id});}
 if(id==='negotiate'){if(rng(s)<s.config.parameters.salesChance+s.experience*.008){const c=client(s,lead.name,200,{sourceEvent:de.id,sourceId:lead.id});lead.clientId=c.id;lead.status='won';emit(s,'turning',`${lead.name}が、最初の継続を託してくれた。`,'毎期200万円を基準とする取引が始まる。',{entities:[c.id,lead.id],causes:[de.id],topic:'client'});}else{lead.status='lost';const e=emit(s,'risk',`${lead.name}とは、契約に届かなかった。`,'今回は予算が合わなかった。それでも、相談した記録と連絡先は残った。',{entities:[lead.id],causes:[de.id],topic:'client'});followup(s,lead.id,e.id);}}
 if(id==='pass')followup(s,lead.id,de.id);
 }
 if(d.type==='large'){
 const c=s.clients.find(c=>c.id===d.entityId);
 if(id==='decline'){const lead=contact(s,c.name+'の開発相談',{sourceId:c.id,sourceEvent:de.id});lead.status='declined';followup(s,lead.id,de.id);}
 else {const k={id:uid(s,'k'),clientId:c.id,value:d.value,start:s.q,end:s.q+d.duration-1,duration:d.duration,active:true,kind:'large',outsource:id==='partner',hireSource:id==='hire',sourceEvent:de.id,renewalConsidered:false};s.contracts.push(k);emit(s,'turning',`${c.name}の大口開発が、会社の日常に加わった。`,`毎期${d.value}万円分、${d.duration}四半期の仕事。${id==='partner'?'期間中は毎期90万円の外注費も発生する。':'採用が決まらなくても、開発は始まる。'}`,{entities:[c.id,k.id],causes:[de.id],topic:'contract'});if(id==='hire')s.threads.push({id:uid(s,'t'),type:'recruit',due:s.q+1,sourceEvent:de.id,contractId:k.id,name:candidate(s)});}
 }
 if(d.type==='hiring'&&id==='welcome'){const name=d.title.split('、')[1].split('との')[0];s.threads.push({id:uid(s,'t'),type:'join',due:s.q+1,name,sourceEvent:de.id});}
 if(d.type==='team'){if(id==='release')leave(s,s.people.find(p=>p.id===d.entityId),de.id,'働き方を見直して');else{s.fatigue=clamp(s.fatigue-35,0,100);r.lowerDemand=.85;}}
 if(d.type==='delegation'){s.flags.delegation=true;const member=s.people.find(p=>p.id===d.entityId);if(id==='delegate'){member.role='開発のまとめ役';s.threads.push({id:uid(s,'t'),type:'improve',due:s.q+2,sourceEvent:de.id,personId:member.id});s.style='delegated';}else{s.skill=round(s.skill+.05);s.fatigue=clamp(s.fatigue+12,0,100);s.style='hands-on';}}
 if(d.type==='relationship'){const c=s.clients.find(c=>c.id===d.entityId);c.renewed=true;if(id==='companion'){c.value=round(c.value*1.15);c.relation=clamp(c.relation+15,0,100);s.style='companion';emit(s,'turning',`${c.name}と、長く続ける仕事の形。`,'新しい大口を追うより、業務を知る相手と積み重ねる道を選んだ。',{entities:[c.id],causes:[de.id],topic:'relationship'});}else followup(s,c.id,de.id);}
 if(d.type==='renewal'){const k=s.contracts.find(k=>k.id===d.entityId);if(id==='maintenance'){const c=s.clients.find(c=>c.id===k.clientId);s.threads.push({id:uid(s,'t'),type:'maintenance',due:k.end+1,sourceEvent:de.id,clientId:c.id,contractId:k.id});}}
 return r;
}
function leave(s,member,cause,why){if(!member?.active)return;member.active=false;member.left=s.q;member.leftReason=why;member.leftCause=cause;emit(s,'risk',`${member.name}と、別々の道を歩くことになった。`,`${member.founding?'創業から一緒だった仲間。':'共に仕事を重ねた仲間。'}${why}、今期から1人少ない体制になった。`,{entities:[member.id],causes:[cause].filter(Boolean),topic:'people'});}
function quarter(prev,d=null,action=null){
 const s=structuredClone(prev),p=s.config.parameters;const oldAr=receivables(s),startCash=s.cash,startDebt=s.debt,startIndex=s.events.length;s.q++;let special=0,borrow=0,lowerDemand=1;
 if(d){const r=apply(s,d,action);special=r.special;borrow=r.borrow;lowerDemand=r.lowerDemand;s.pending=null;}
 const due=s.threads.filter(t=>t.due<=s.q);s.threads=s.threads.filter(t=>t.due>s.q);
 for(const t of due){
 if(t.type==='referral'){if(rng(s)<p.referralChance&&s.contacts.filter(c=>c.status==='available').length<2){const source=s.clients.find(c=>c.id===t.sourceId)||s.contacts.find(c=>c.id===t.sourceId);const name=newName(s);const e=emit(s,'turning',`${source?.name||'以前の相談相手'}から、別の会社を紹介された。`,`${name}が開発先を探しているという。あのとき交わした相談が、時間をおいて戻ってきた。`,{entities:[t.sourceId],causes:[t.sourceEvent],topic:'referral'});const lead=contact(s,name,{sourceId:t.sourceId,sourceEvent:e.id});e.entities.push(lead.id);} }
 if(t.type==='join'||t.type==='recruit'){if(t.type==='join'||rng(s)<p.hireChance){const member=person(s,t.name,false,t.sourceEvent);emit(s,'turning',`${member.name}が、この会社の仲間になった。`,'今日から一緒に働く。処理能力が増え、給与も今期から発生する。',{entities:[member.id,t.contractId].filter(Boolean),causes:[t.sourceEvent],topic:'people'});}else{const e=emit(s,'risk',`${t.name}の採用は、まとまらなかった。`,'条件が折り合わず、今回は見送り。引き受けた仕事は今の体制で進める。',{entities:[t.contractId].filter(Boolean),causes:[t.sourceEvent],topic:'people'});s.flags.hiringMissed=(s.flags.hiringMissed||0)+1;s.threads.push({id:uid(s,'t'),type:'candidateReferral',due:s.q+3,sourceEvent:e.id,name:t.name});}}
 if(t.type==='candidateReferral'&&rng(s)<.5){const name=candidate(s);emit(s,'turning',`採用できなかった${t.name}から、知人の話が届く。`,`${name}が転職を考えているという。採用できなかった縁が、別の入口になった。`,{causes:[t.sourceEvent],topic:'referral'});s.flags.candidateName=name;s.cooldowns.hiring=0;}
 if(t.type==='improve'){const member=s.people.find(p=>p.id===t.personId);if(member?.active){s.skill=round(s.skill+.1);s.fatigue=clamp(s.fatigue-22,0,100);emit(s,'turning',`${member.name}に任せた仕事が、回り始めた。`,'引継ぎから半年。処理能力が上がり、チームの負担も軽くなった。',{entities:[member.id],causes:[t.sourceEvent],topic:'people'});}}
 if(t.type==='maintenance'){const c=s.clients.find(c=>c.id===t.clientId);if(c?.active){c.value=round(c.value+70);emit(s,'turning',`${c.name}との大口開発が、保守の関係へ変わった。`,'あの開発でつながった相手と、毎期70万円分の仕事が続く。',{entities:[c.id,t.contractId],causes:[t.sourceEvent],topic:'relationship'});}}
 }
 if(rng(s)>p.macroStay){const old=s.macro;s.macro=pick(s,[0,1,2]);if(old!==s.macro)emit(s,'world',['取引先も、予算に慎重になってきた。','街の仕事が、いつもの調子へ。','街に、新しい仕事の気配。'][s.macro],['景気の向かい風が、取引先全体の注文に影響する。','注文の基準が平常に戻る。','取引先全体の注文が上向きになった。'][s.macro],{major:false,topic:'world'});}
 const clients=activeClients(s);
 if(clients.length&&s.q>=(s.cooldowns.contract||0)&&rng(s)<p.contractionChance*(s.macro===0?1.6:1)){const c=pick(s,clients);const lost=round(c.value*.4);if(lost>10){c.value=round(c.value-lost);s.cooldowns.contract=s.q+3;emit(s,'risk',`${c.name}から、予算見直しの知らせ。`,`毎期の基準受注が${Math.round(lost)}万円分減った。${c.since===0?'創業時からの取引先だけに、影響は小さくない。':'一度つながった仕事も、そのままとは限らない。'}`,{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'client'});}}
 if(clients.length&&rng(s)<p.additionChance){const c=pick(s,clients);c.value=round(c.value+25);c.relation=clamp(c.relation+5,0,100);emit(s,'ordinary',`${c.name}から、いつもの仕事の続き。`,'取引を重ねるうち、基準受注が毎期25万円分増えた。',{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),major:false,topic:'relationship'});}
 if((!clients.length||rng(s)<(clients.length<3&&s.last.load<.8?p.underbookedPipelineChance:p.pipelineChance))&&s.q>=(s.cooldowns.pipeline||0)&&s.contacts.filter(c=>c.status==='available').length<1){s.cooldowns.pipeline=s.q+2;const source=clients.length?pick(s,clients):null;const e=emit(s,'turning',source?`${source.name}が、次の縁を運んできた。`:'まだ実績のない会社に、問い合わせが届いた。',source?'日々の仕事を見ていた相手が、知り合いの会社を紹介してくれた。':'活動を見つけた事業者が、開発の相談をしたいという。',{entities:source?[source.id]:[],causes:source?.sourceEvent?[source.sourceEvent]:[],topic:'referral'});const lead=contact(s,newName(s),{sourceId:source?.id,sourceEvent:e.id});e.entities.push(lead.id);}
 const running=s.contracts.filter(k=>k.active&&k.start<=s.q&&k.end>=s.q);const base=sum(clients.map(c=>c.value));const demand=round((base*[.79,1,1.16][s.macro]*(.9+rng(s)*.2)+sum(running.map(k=>k.value)))*lowerDemand);const external=running.filter(k=>k.outsource).length;const capacity=round((staff(s)+1)*p.capacityPerPerson*s.skill*(1-s.fatigue/600)+external*180);const work=demand+s.backlog,revenue=round(Math.min(work,capacity)),load=work/capacity;s.backlog=round(Math.max(0,work-capacity));s.fatigue=clamp(s.fatigue+(load>1.12?16:load>1?6:-9)+(s.style==='hands-on'?3:0)-(s.style==='companion'?3:0),0,100);s.trust=clamp(s.trust+(load<=1.15?1:-2),0,100);
 if(load>1.18&&s.q>=(s.cooldowns.overwork||0)){s.cooldowns.overwork=s.q+3;emit(s,'risk','仕事はある。でも、机の向こうに余裕がない。',`処理能力に対する仕事量は${Math.round(load*100)}%。仕事の残りと疲れが積み重なり始めた。`,{entities:running.map(k=>k.id),causes:running.map(k=>k.sourceEvent),topic:'workload'});}
 if(s.backlog>capacity*.8){s.backlog=round(capacity*.8);s.trust=clamp(s.trust-7,0,100);}
 let collections=0,ar=[];for(const r of s.receivables){if(r.due<=s.q)collections+=r.amount;else ar.push(r);}let now=round(revenue*p.collectionShare),later=round(revenue-now),delayed=false;
 if(now>0&&clients.length&&s.q>=(s.cooldowns.delay||0)&&rng(s)<p.delayChance){const c=pick(s,clients);delayed=true;s.cooldowns.delay=s.q+3;ar.push({amount:now,due:s.q+1});const value=now;now=0;emit(s,'risk',`${c.name}を含む取引先の入金が、次の季節へ。`,`当期回収予定の${Math.round(value)}万円が遅れた。納品した売上は消えないが、支払いに使える現金は減る。`,{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'finance'});}
 collections=round(collections+now);if(later>0)ar.push({amount:later,due:s.q+1});s.receivables=ar;
 const operating=round(costs(s)+special+external*90),interest=round(s.debt*p.quarterlyInterest),repay=round(Math.min(p.quarterlyPrincipal,s.debt)),profit=round(revenue-operating-interest);s.cash=round(startCash+collections+borrow-operating-interest-repay);s.debt=round(s.debt-repay);
 for(const k of running.filter(k=>k.end===s.q)){
 k.active=false;const c=s.clients.find(c=>c.id===k.clientId);
 if(k.kind==='trial'){const lead=s.contacts.find(l=>l.id===k.leadId);if(load<1.3&&rng(s)<p.trialConversionChance){c.value=round(160+s.experience*3);c.relation=65;lead.status='won';emit(s,'turning',`${c.name}が、「次もお願いしたい」と言ってくれた。`,`試作から、毎期約${Math.round(c.value)}万円を基準にした継続取引へつながった。`,{entities:[c.id,lead.id,k.id],causes:[k.sourceEvent],topic:'client'});}else{c.active=false;lead.status='lost';const e=emit(s,'ordinary',`${c.name}との試作は、ひとまずここまで。`,'納品の売上は残ったが、今回は継続契約に至らなかった。',{entities:[c.id,lead.id],causes:[k.sourceEvent],topic:'client'});followup(s,lead.id,e.id);}}
 else emit(s,'turning',`${c.name}の大口受注期間が、一区切り。`,`${k.duration}四半期の追加受注が終わった。${s.backlog>0?'会社には、まだ納めきれていない仕事がある。':''}${k.hireSource?(s.people.some(p=>p.sourceEvent===k.sourceEvent&&p.active)?'この受注をきっかけに採用した仲間の給与は、仕事が終わっても続く。':'仲間を探しながら進めた開発が、会社の経歴に残った。'):k.outsource?'案件に付随した外注費も、ここで終わる。':'会社には、この仕事を引き受けた記録が残る。'}`,{entities:[c.id,k.id],causes:[k.sourceEvent],topic:'contract'});
 }
 for(const c of activeClients(s)){c.relation=clamp(c.relation+(load<1.15?2:-2),0,100);if(s.q-c.since===8)emit(s,'turning',`${c.name}と、2年を重ねた。`,'新しい受注だけでなく、同じ相手と約束を続けた時間も、この会社の歴史になった。',{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'relationship'});}
 if(activeTeam(s).length&&s.q>=(s.cooldowns.departure||0)&&rng(s)<p.departureChance+(s.fatigue>70?.1:0)){const member=pick(s,activeTeam(s));s.cooldowns.departure=s.q+4;leave(s,member,member.sourceEvent,'本人の都合と働き方を相談して');}
 if(s.cash<0){s.ended='insolvent';emit(s,'ending','この季節の支払いを、つなげなかった。','四半期末の現金が不足し、会社の経営はここで止まった。ここまでに生まれた仕事や関係は記録に残る。',{topic:'ending'});}else if(s.q>=20)s.ended='five-years';
 const events=s.events.slice(startIndex);s.last={revenue,profit,operating,interest,repay,borrow,collections,oldAr,newAr:receivables(s),startCash,startDebt,deltaCash:round(s.cash-startCash),load:round(load),demand,capacity,delayed,special,external:external*90,events};s.history.push({q:s.q,cash:s.cash,debt:s.debt,staff:staff(s),chapter:chapter(s),...structuredClone(s.last)});return s;
}
export function advance(prev){if(prev.ended)throw Error('終了済みです');if(prev.pending)throw Error('この節目の判断を選んでください');let s=structuredClone(prev);const start=s.history.length;s.batch=[];for(let i=0;i<3&&!s.ended;i++){if(discover(s))break;s=quarter(s);if(s.last.events.some(e=>e.major))break;}s.batch=s.history.slice(start).map(h=>h.q);return s;}
export function resolve(prev,choiceId){if(!prev.pending||prev.ended)throw Error('判断待ちの局面がありません');let s=quarter(prev,prev.pending,choiceId);s.batch=[s.q];return s;}
export function close(prev){const s=structuredClone(prev);s.ended='closed';s.pending=null;emit(s,'ending','ここで、ひとつの区切りを選んだ。','続ける道だけでなく、自分で区切る判断も、この会社の一部。',{topic:'ending'});return s;}
export function restore(raw){const s=JSON.parse(raw);if(s.model!==MODEL)throw Error('この記録は別の版です。元の記録を書き出して保管できます。');validate(s.config);if(!Number.isInteger(s.q)||s.q<0||s.q>20||!Number.isFinite(s.cash)||!Number.isInteger(s.rng)||!Array.isArray(s.people)||!Array.isArray(s.events)||!Array.isArray(s.history)||!Array.isArray(s.threads)||!Array.isArray(s.contacts)||!s.origin||!s.config.origins.some(o=>o.id===s.originId)||!s.last||!s.initial||!s.people.every(p=>typeof p.name==='string'&&Number.isFinite(p.salary)))throw Error('記録の形式が不正です。元のデータは削除していません。');if(s.pending&&(!s.pending.options?.length||s.pending.at!==s.q+1))throw Error('判断待ちの記録を読み込めません。');return s;}
export function reflection(s){
 const notes=[],left=s.people.filter(p=>!p.active),joined=s.people.filter(p=>!p.founding),returned=staff(s)===s.initial.staff&&left.length&&joined.length;
 if(returned)notes.push({title:'同じ人数に、違う道のりで。',text:`${left.map(p=>p.name).join('、')}と別れた後、${joined.map(p=>p.name).join('、')}を迎えた。創業時と今は同じ${staff(s)+1}人でも、同じチームではない。`,entities:[...left,...joined].map(p=>p.id)});
 else if(left.length)notes.push({title:'一緒に始めて、別々の道へ。',text:`${left.map(p=>p.name).join('、')}と働いた時間が残っている。${joined.length?`その後、${joined.map(p=>p.name).join('、')}が新しい仲間になった。`:'その後は、残った体制で仕事に向き合った。'}`,entities:left.map(p=>p.id)});
 const referred=s.events.find(e=>e.topic==='referral'&&e.causes.some(id=>s.events.some(p=>p.id===id&&(p.topic==='inquiry'||p.kind==='risk'||p.topic==='large'))));
 if(referred){const cause=s.events.find(e=>e.id===referred.causes[0]);notes.push({title:'つながらなかった話にも、続きがあった。',text:`「${cause.title}」という出来事から、「${referred.title}」へ。抽選の結果だけで終わらず、後の縁になった。`,entities:referred.entities});}
 const large=s.contracts.find(k=>k.kind==='large'&&k.hireSource);if(large){const c=s.clients.find(c=>c.id===large.clientId),people=s.people.filter(p=>p.sourceEvent===large.sourceEvent);notes.push({title:people.length?'あの受注が、会社の体制を変えた。':'受けた仕事と、採用の難しさ。',text:`${c.name}の大口開発を受けて、採用に踏み出した。${people.length?`${people.map(p=>p.name).join('、')}が加わり、${large.active?'今も仕事を進めている。':'案件が終わった後にも、その人と働いた経緯が残った。'}`:'仲間を探すことと、仕事の時期が合うとは限らなかった。'}`,entities:[c.id,...people.map(p=>p.id)]});}
 const loyal=activeClients(s).filter(c=>s.q-c.since>=8).sort((a,b)=>a.since-b.since)[0];if(loyal)notes.push({title:'大きくなる以外にも、重ねたもの。',text:`${loyal.name}と${Math.floor((s.q-loyal.since)*3)}か月。${loyal.renewed?'関係を続ける形を考え、選んだ。':'毎期の仕事を重ね、関係が残った。'}`,entities:[loyal.id]});
 if(s.flags.delegation)notes.push({title:s.style==='delegated'?'任せ合う会社へ進んだ。':'現場に立つことを選んだ。',text:s.style==='delegated'?`${s.people.find(p=>p.role==='開発のまとめ役')?.name||'仲間'}に仕事を任せ、創業者ひとりで回す体制が変わった。`:'人が増えた後も、自分が開発の中心に立ち続ける道を選んだ。',entities:[]});
 if(!notes.length)notes.push({title:activeClients(s).length?'ひとつずつ、信頼を重ねた。':'最初の信頼を探し続けた。',text:activeClients(s).length?`${activeClients(s).map(c=>c.name).slice(0,3).join('、')}との仕事が、今の会社につながっている。`:'問い合わせや交渉を重ねたが、継続する顧客にはまだ届かなかった。その時間も、この会社が経験したこと。',entities:[]});return notes.slice(0,4);
}
