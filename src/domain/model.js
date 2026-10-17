import {EVIDENCE,ASSUMPTIONS as A,randomChannel,cyberTrial,annualRecruitOutcome,GENERATION_ASSUMPTIONS as G,hiringMonth,harmTier} from './evidence.js';
export const MODEL = 'company-life-3';
export const round = n => Math.round(n * 100) / 100;
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const sum = a => round(a.reduce((x,y)=>x+y,0));
export function rng(s) { s.rng=(s.rng+0x6D2B79F5)>>>0;let t=s.rng;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; }
const pick = (s,a) => a[Math.floor(rng(s)*a.length)];
const between = (s,a,b) => round(a+rng(s)*(b-a));
const uid = (s,prefix) => `${prefix}${++s.serial}`;
export function validate(c) {
  if(c.unit!=='万円 / 四半期'||!c.version||!['架空の小規模受託ソフトウェア会社・創業5年以内','架空の小規模受託ソフトウェア会社・継続観測'].includes(c.scope))throw Error('設定の単位・版・対象が不正です');
  for(const key of ['founderPay','employeePay','overhead','capacityPerPerson','collectionShare','quarterlyInterest','quarterlyPrincipal','hireChance','delayChance','departureChance','salesChance','contractionChance','macroStay','referralChance','offerChance','pipelineChance','additionChance','trialConversionChance','underbookedPipelineChance']) {
    const n=c.parameters[key];if(!Number.isFinite(n)||n<0)throw Error(`設定値が欠測または不正: ${key}`);
    if(/Chance$|Share$|Stay$|Interest$/.test(key)&&n>1)throw Error(`割合の範囲が不正: ${key}`);
  }
  if(!Array.isArray(c.origins)||c.origins.length!==3)throw Error('創業条件が不足しています');
  for(const o of c.origins){for(const k of ['cash','experience'])if(!Array.isArray(o[k])||o[k].length!==2||!o[k].every(Number.isFinite)||o[k][0]>o[k][1])throw Error('創業条件の範囲が不正');if(!Number.isFinite(o.fixed)||!Number.isFinite(o.debt)||!Number.isFinite(o.skill)||o.skill<=0||!Number.isFinite(o.teamSalary)||!Array.isArray(o.team)||!Array.isArray(o.clients))throw Error('創業条件が不正');}
  if(!Array.isArray(c.peopleProfiles)||!c.peopleProfiles.length||c.peopleProfiles.some(p=>![p.salary,p.capacity,p.rampQuarters,p.rampFactor,p.strainLimit].every(Number.isFinite)||p.salary<0||p.capacity<=0||p.rampFactor<=0||p.rampFactor>1))throw Error('人物設定が不正です');
  return c;
}
export const activeTeam=s=>s.people.filter(p=>p.active);
export const activeClients=s=>s.clients.filter(c=>c.active);
export const staff=s=>activeTeam(s).length;
export const costs=s=>round(s.config.parameters.founderPay+sum(activeTeam(s).map(p=>p.salary))+s.fixed+(s.life?.version>=2?sum(activeClients(s).map(c=>c.serviceCost||0)):0));
export const receivables=s=>sum(s.receivables.map(r=>r.amount));
export const clientWork=(s,c)=>c.value+sum(s.contracts.filter(p=>p.active&&p.clientId===c.id).map(p=>p.value));
export const concentration=s=>{const amounts=activeClients(s).map(c=>clientWork(s,c)),total=sum(amounts);return total?Math.max(...amounts)/total:0;};
export const chapter=s=>staff(s)>=3?'仲間と任せ合う会社':s.style==='companion'?'長く伴走する会社':s.clients.filter(c=>c.active&&s.q-c.since>=8).length?'続けてきた約束':activeClients(s).length>=3?'仕事がつながる頃':!activeClients(s).length?'最初の信頼を探して':'小さな会社のはじまり';
export function emit(s,kind,title,text,{entities=[],causes=[],major=true,topic='company'}={}) {
 const e={id:uid(s,'e'),q:s.q,...(s.calendarMonth!==undefined?{month:s.calendarMonth}:{}),kind,title,text,entities,causes,major,topic};s.events.push(e);return e;
}
function person(s,name,founding=false,cause=null,profile=null){
 const spec=profile||structuredClone(s.config.peopleProfiles[founding?2:0]);
 const p={id:uid(s,'p'),name,role:founding?'創業メンバー':'開発メンバー',active:true,founding,joined:s.q,joinedMonth:s.calendarMonth??s.q*3,left:null,sourceEvent:cause,joinEvent:null,salary:founding?s.origin.teamSalary:spec.salary,profile:spec,strain:0,worked:0,overloadPeriods:0};s.people.push(p);return p;
}
export function personCapacity(s,p){const spec=p.profile;return spec?spec.capacity*(p.founding||p.worked>=spec.rampQuarters?1:spec.rampFactor):s.config.parameters.capacityPerPerson;}
function applicant(s,name=null){return {name:name||candidate(s),profile:structuredClone(pick(s,s.config.peopleProfiles))};}
function joinCause(s,p){return p.joinEvent||s.events.find(e=>e.topic==='people'&&e.entities.includes(p.id)&&e.q===p.joined&&e.kind==='turning')?.id||p.sourceEvent;}
function client(s,name,value,{relation=50,sourceEvent=null,sourceId=null}={}){const c={id:uid(s,'c'),name,value:round(value),relation,active:true,since:s.q,...(s.calendarMonth!==undefined?{sinceMonth:s.calendarMonth}:{}),sourceEvent,sourceId,renewed:false};s.clients.push(c);return c;}
function candidate(s){return pick(s,['高橋','石井','中村','小林','山田','清水','松本','加藤','阿部','森','池田','岡田'].filter(n=>n!==s.founder?.name&&!s.people.some(p=>p.name===n)&&!s.threads.some(t=>t.name===n)))||`紹介の開発者${s.serial}`;}
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
   if(team.length&&team.at(-1).id!==currentLeader(s)?.personId)opts.push(choice('reduce',`${team.at(-1).name}と別れ、体制を縮める`,45,'整理費45万円。今期から対象の仲間の給与を削減。','仕事の処理能力も失う。後から同じ仲間を補充はできない。'));
   opts.push(choice('endure','今ある仕事を納め、回収を待つ',0,'新しい支出を増やさず、この3か月を進める。',s.life?'資金が不足すれば再建の判断で停止し、成立しなければ清算へ進む。':'期末に現金が不足すれば、会社は継続できない。'));
   return decision(s,'crisis','次の支払いまで、あまり時間がない。',`手元資金は${Math.round(s.cash)}万円。通常の四半期費用は約${Math.round(reserve)}万円。${receivables(s)?`入金待ちの${Math.round(receivables(s))}万円もあるが、まだ現金ではない。`:'これからの受注だけで支払いを賄えるかは分からない。'}`,team.at(-1)?.id||null,opts,s.events.filter(e=>e.kind==='risk').slice(-2).map(e=>e.id));
 }
 if(s.q<(s.cooldowns.decision||0))return false;
 const member=team.filter(p=>p.id!==currentLeader(s)?.personId&&p.worked>=2&&p.strain>=p.profile.strainLimit).sort((a,b)=>b.strain-a.strain)[0];
 if(member&&s.q>=(s.cooldowns.team||0)){
 const months=s.calendarMonth!==undefined?s.calendarMonth-(member.joinedMonth??member.joined*3):(s.q-member.joined+1)*3,early=!member.founding&&member.worked<3;s.cooldowns.team=s.q+4;
 return decision(s,'team',early?`${member.name}から、慣れるまでの支援について相談。`:`${member.name}が、働き方を相談してきた。`,`${member.founding?'創業から':`入社から${months}か月`}${member.name}と働いてきた。${early?'まだ仕事に慣れる時期だが、':`${member.overloadPeriods}四半期、仕事量の多い時期を経験した。`}${member.profile.concern}`,member.id,[choice('relieve',early?'仕事を絞り、教える時間をつくる':'仕事の量を減らし、一緒に続ける',20,'調整費20万円。今期と次期の新しい受注量を20%減らす。本人の負担 −30。','売上の機会は減る。残っている仕事を納める時間をつくる。'),choice('release','別の道を尊重し、送り出す',45,`整理費45万円。今期から報酬${member.salary}万円と処理能力1人分が減る。`,'その人と働いた記録は、この会社に残る。')],[joinCause(s,member),...s.events.filter(e=>e.topic==='workload'&&e.q>=member.joined).slice(-1).map(e=>e.id)].filter(Boolean));
 }
 if(team.length>=3&&!s.flags.delegation){const member=team.find(p=>p.id!==currentLeader(s)?.personId);return decision(s,'delegation',`${member.name}に、仕事の一部を任せる？`,'仲間が増えたのに、確認も顧客対応も現在の社長に集まっている。開発する会社から、人を任せ合う会社へ進む節目かもしれない。',member.id,[choice('delegate',`${member.name}を、開発のまとめ役にする`,45,'引継ぎ費45万円。2期後に処理倍率 +0.10、疲労を軽減。','これからは、仲間に任せて進める会社になる。'),choice('handsOn','自分が現場を引っ張り続ける',0,'追加費用なし。処理倍率 +0.05、疲労 +12。','今は仕事を増やせるが、負担は現在の社長に残る。')],team.filter(p=>p.sourceEvent).slice(-1).map(p=>p.sourceEvent));}
 const veteran=clients.find(c=>s.q-c.since>=7&&c.relation>=60&&!c.renewed);
 if(veteran&&team.length<=1&&s.q>=7){return decision(s,'relationship',`${veteran.name}から、「これからも」の相談。`,'新しい会社ではなく、日々の業務を知るあなたたちに頼みたい。小さいまま積み重ねた時間にも、次の形がある。',veteran.id,[choice('companion','長く伴走する、保守契約へ進む',20,'調整費20万円。この顧客の基準受注 +15%。会社全体を保守中心にし、その間は新規の大口相談を受けない。','会社全体を保守中心へ変更。この方針中は新規の大口案件の相談が発生しない。通常の紹介と既存案件は続く。委任などで別の経営方針になると大口相談の対象に戻る。'),choice('explore','関係は守りつつ、新しい分野も探す',25,'開拓費25万円。この顧客との契約額は維持。','つながりを頼りに紹介を待つ。新規契約は保証されない。')],[veteran.sourceEvent].filter(Boolean));}
 const expiring=s.contracts.find(c=>c.active&&c.end===s.q+1&&c.kind==='large'&&!c.renewalConsidered);
 if(expiring){const c=s.clients.find(c=>c.id===expiring.clientId);expiring.renewalConsidered=true;return decision(s,'renewal',`${c.name}の大口案件が、一区切りを迎える。`,`${expiring.duration}四半期続いた開発が終わる。${expiring.hireSource&&s.people.some(p=>p.sourceEvent===expiring.sourceEvent&&p.active)?'あの受注をきっかけに迎えた仲間の給与は、その後も続く。':'次の仕事を引き受けるか、いったん余白をつくるか。'}`,expiring.id,[choice('maintenance','保守契約を引き受け、関係を残す',15,'調整費15万円。案件終了後、この顧客の毎期受注 +70万円。','大口開発ほどの売上にはならない。'),choice('finish','開発で区切り、新しい仕事を探す',0,'追加支出なし。大口案件は予定どおり終了。','空いた能力を別の案件に使えるが、受注は未定。')],[expiring.sourceEvent]);}
 const available=s.contacts.find(c=>c.status==='available');
 if(available){const source=available.sourceId?s.clients.find(c=>c.id===available.sourceId)||s.contacts.find(c=>c.id===available.sourceId):null;if(s.timelineVersion)return contextualInquiry(s,available,source);return decision(s,'inquiry',`${available.name}から、小さな開発の相談。`,`${source?`${source.name}とのつながりから届いた話。`:'実績を聞きつけて届いた、はじめての相談。'}まずは短い試作から、と言われている。`,available.id,[choice('trial','小さく引き受け、信頼をつくる',10,'準備費10万円。今期180万円分の試作を受注。','納品できれば継続契約につながることがある。'),choice('negotiate','継続契約を条件に、交渉する',15,'打ち合わせ費15万円。毎期200万円規模を提案。','成約は未確定。失注しても、会った相手は記録に残る。'),choice('pass','今回は見送り、今の仕事を守る',0,'受注せず、相手との連絡先だけを残す。','仕事は増えない。後日、別の紹介が届く可能性もある。')],[available.sourceEvent].filter(Boolean));}
 if(clients.length&&s.q>=(s.cooldowns.offer||0)&&s.style!=='companion'&&rng(s)<p.offerChance){
 const c=pick(s,clients),value=Math.round(between(s,180,300)),duration=pick(s,[2,3,4]);s.cooldowns.offer=s.q+4;
 const d=decision(s,'large',`${c.name}から、今までより大きな相談。`,`${duration}四半期のあいだ、毎期${value}万円分の追加開発。今の仕事に重なる。受注をきっかけに、人を増やすか、外の力を借りるか。`,c.id,[choice('hire','受ける。そして、一緒に働く仲間を探す',35,'採用活動35万円。採用できれば翌期から給与110〜155万円/期（候補者による）。','採用前も案件は始まる。案件が終わっても給与は残る。'),choice('partner','外部の開発者と組んで、受ける',0,'案件が動く各期に外注90万円。処理能力 +180万円分。','初期活動費なし。外注費は案件期間中、毎期支払う。'),choice('decline','今の約束を守るため、見送る',0,'追加支出なし。既存の仕事は通常どおり続く。','この売上は得られない。相談した相手との縁は残る。')],[c.sourceEvent].filter(Boolean));s.pending.value=value;s.pending.duration=duration;return d;
 }
 if((s.last.load>1.1||s.fatigue>40)&&team.length<5&&s.cash>reserve&&s.q>=(s.cooldowns.hiring||0)){
 s.cooldowns.hiring=s.q+4;const candidateInfo=applicant(s,s.flags.candidateName||null);delete s.flags.candidateName;const {name,profile}=candidateInfo;
 decision(s,'hiring',`仕事が増えるなか、${name}との縁がつながった。`,`${profile.label}。${profile.description} 給与は毎期${profile.salary}万円、慣れた後の処理能力は${profile.capacity}万円分。`,null,[choice('welcome',`${name}を仲間に迎える`,35,`採用準備35万円。翌期から給与${profile.salary}万円/期。最初の${profile.rampQuarters*3}か月の処理能力は${Math.round(profile.capacity*profile.rampFactor)}万円分。`,'内定承諾済み。仕事が減っても給与は発生する。'),choice('wait','今の体制で続け、連絡先を残す',0,'費用・人数は変わらない。','後から同じ人を採用できるとは限らない。')],s.events.filter(e=>e.topic==='workload').slice(-1).map(e=>e.id));s.pending.candidate=candidateInfo;return true;}

 return false;
}
const customerNames=['田辺食品','波止場デザイン','森川工務店','ひだまり出版','青葉物流','三浦商店','北町の旅館','吉田製作所'];
function newName(s){return pick(s,customerNames.filter(n=>!s.clients.some(c=>c.name===n)&&!s.contacts.some(c=>c.name===n)))||`紹介の事業者${s.serial}`;}
function followup(s,sourceId,sourceEvent){s.threads.push({id:uid(s,'t'),type:'referral',due:s.q+pick(s,[2,3,4]),sourceId,sourceEvent});}
function apply(s,d,id){const a=d.options.find(a=>a.id===id);if(!a)throw Error('この局面では選べません');const r={special:a.cost,borrow:0,lowerDemand:1,capacityBonus:0},entities=[d.entityId].filter(Boolean);const de=emit(s,'choice',a.title,`${d.title} ${a.desc}`,{entities,causes:d.causes,topic:d.type});s.decisions.push({id:d.id,q:s.q,...(s.calendarMonth!==undefined?{month:s.calendarMonth}:{}),type:d.type,prompt:d.title,choiceId:id,choice:a.title,description:a.desc,eventId:de.id,entityId:d.entityId,before:{load:s.last.load,backlog:s.backlog,fatigue:s.fatigue},initiated:d.initiated||false});
 if(d.type==='crisis'||d.type==='finance'){
 if(id==='borrow'){r.borrow=300;s.debt+=300;emit(s,'turning','会社を続けるための、時間を借りた。','300万円が入金された。借入であり、売上や利益ではない。',{causes:[de.id],topic:'finance'});}
 if(id==='reduce'){const member=s.people.find(p=>p.id===d.entityId);leave(s,member,de.id,'資金を守るため');}
 }
 if(d.type==='inquiry'){
 const lead=s.contacts.find(c=>c.id===d.entityId);lead.status=id==='pass'?'passed':id==='trial'?'trial':'negotiating';lead.decisionEvent=de.id;
 if(id==='trial') {const c=client(s,lead.name,0,{sourceEvent:de.id,sourceId:lead.id});lead.clientId=c.id;s.contracts.push({id:uid(s,'k'),clientId:c.id,value:d.trialValue??180,continuationValue:d.recurringValue??null,conversionBonus:d.conversionBonus||0,start:s.q,end:s.q,active:true,kind:'trial',sourceEvent:de.id,leadId:lead.id});}
 if(id==='negotiate'){if(rng(s)<s.config.parameters.salesChance+s.experience*.008){const c=client(s,lead.name,200,{sourceEvent:de.id,sourceId:lead.id});lead.clientId=c.id;lead.status='won';emit(s,'turning',`${lead.name}が、最初の継続を託してくれた。`,'毎期200万円を基準とする取引が始まる。',{entities:[c.id,lead.id],causes:[de.id],topic:'client'});}else{lead.status='lost';const e=emit(s,'risk',`${lead.name}とは、契約に届かなかった。`,'今回は予算が合わなかった。それでも、相談した記録と連絡先は残った。',{entities:[lead.id],causes:[de.id],topic:'client'});followup(s,lead.id,e.id);}}
 if(id==='pass')followup(s,lead.id,de.id);
 }
 if(d.type==='large'){
 const c=s.clients.find(c=>c.id===d.entityId);
 if(id==='decline'){const lead=contact(s,c.name+'の開発相談',{sourceId:c.id,sourceEvent:de.id});lead.status='declined';followup(s,lead.id,de.id);}
 else {const k={id:uid(s,'k'),clientId:c.id,value:d.value,start:s.q,end:s.q+d.duration-1,duration:d.duration,active:true,kind:'large',outsource:id==='partner',hireSource:id==='hire',sourceEvent:de.id,renewalConsidered:false};s.contracts.push(k);emit(s,'turning',`${c.name}の大口開発が、会社の日常に加わった。`,`毎期${d.value}万円分、${d.duration}四半期の仕事。${id==='partner'?'期間中は毎期90万円の外注費も発生する。':id==='inhouse'?'今の体制で担当する。追加の採用費・外注費は発生しない。':'採用が決まらなくても、開発は始まる。'}`,{entities:[c.id,k.id],causes:[de.id],topic:'contract'});if(id==='hire')s.threads.push({id:uid(s,'t'),type:'recruit',due:s.q+1,sourceEvent:de.id,contractId:k.id,...applicant(s)});}
 }
 if(d.type==='hiring'&&id==='welcome'){s.threads.push({id:uid(s,'t'),type:'join',due:s.q+1,...d.candidate,sourceEvent:de.id});}
 if(d.type==='team'){if(id==='release')leave(s,s.people.find(p=>p.id===d.entityId),de.id,'働き方を見直して');else{const member=s.people.find(p=>p.id===d.entityId);member.strain=clamp(member.strain-30,0,100);s.fatigue=clamp(s.fatigue-25,0,100);setWorkPlan(s,.8,de.id,member.id);}}
 if(d.type==='workload'){
 if(id==='adjust'){setWorkPlan(s,.6,de.id);s.fatigue=clamp(s.fatigue-15,0,100);}
 if(id==='bridge'){r.capacityBonus=180;}
 if(id==='recruit'){s.threads.push({id:uid(s,'t'),type:'recruit',due:s.q+1,...applicant(s),sourceEvent:de.id});}
 }
 if(d.type==='delegation'){s.flags.delegation=true;const member=s.people.find(p=>p.id===d.entityId);if(id==='delegate'){member.role='開発のまとめ役';s.threads.push({id:uid(s,'t'),type:'improve',due:s.q+2,sourceEvent:de.id,personId:member.id});s.style='delegated';}else{s.skill=round(s.skill+.05);s.fatigue=clamp(s.fatigue+12,0,100);s.style='hands-on';}}
 if(d.type==='relationship'){const c=s.clients.find(c=>c.id===d.entityId);c.renewed=true;if(id==='companion'){c.value=round(c.value*1.15);c.relation=clamp(c.relation+15,0,100);s.style='companion';emit(s,'turning',`${c.name}と、長く続ける仕事の形。`,'新しい大口を追うより、業務を知る相手と積み重ねる道を選んだ。',{entities:[c.id],causes:[de.id],topic:'relationship'});}else followup(s,c.id,de.id);}
 if(d.type==='renewal'){const k=s.contracts.find(k=>k.id===d.entityId);if(id==='maintenance'){const c=s.clients.find(c=>c.id===k.clientId);s.threads.push({id:uid(s,'t'),type:'maintenance',due:k.end+1,sourceEvent:de.id,clientId:c.id,contractId:k.id});}}
 return r;
}
function leave(s,member,cause,why){if(!member?.active)return;member.active=false;member.left=s.q;member.leftMonth=s.calendarMonth??s.q*3;member.leftReason=why;member.leftCause=cause;emit(s,'risk',`${member.name}と、別々の道を歩くことになった。`,`${member.founding?'創業から一緒だった仲間。':'共に仕事を重ねた仲間。'}${why}、今期から1人少ない体制になった。`,{entities:[member.id],causes:[cause].filter(Boolean),topic:'people'});}
function processThreads(s,due){const p=s.config.parameters;
 for(const t of due){
 if(t.type==='referral'){if(rng(s)<p.referralChance&&s.contacts.filter(c=>c.status==='available').length<2){const source=s.clients.find(c=>c.id===t.sourceId)||s.contacts.find(c=>c.id===t.sourceId);const name=newName(s);const e=emit(s,'turning',`${source?.name||'以前の相談相手'}から、別の会社を紹介された。`,`${name}が開発先を探しているという。あのとき交わした相談が、時間をおいて戻ってきた。`,{entities:[t.sourceId],causes:[t.sourceEvent],topic:'referral'});const lead=contact(s,name,{sourceId:t.sourceId,sourceEvent:e.id});e.entities.push(lead.id);} }
 if(t.type==='join'||t.type==='recruit'||t.type==='annualRecruit'){if(t.type==='join'||(t.type==='annualRecruit'?t.fulfilled:rng(s)<p.hireChance)){const member=person(s,t.name,false,t.sourceEvent,t.profile);const joined=emit(s,'turning',`${member.name}が、この会社の仲間になった。`,`${member.profile.label}。今期から給与${member.salary}万円が発生。最初の${member.profile.rampQuarters*3}か月は仕事に慣れる期間。`,{entities:[member.id,t.contractId].filter(Boolean),causes:[t.sourceEvent],topic:'people'});member.joinEvent=joined.id;if(s.life?.version>=2&&t.contactId){const c=s.life.savedCandidates.find(c=>c.id===t.contactId);if(c)c.status='joined';}}else{const e=emit(s,'risk',`${t.name}の採用は、まとまらなかった。`,'条件が折り合わず、今回は見送り。引き受けた仕事は今の体制で進める。',{entities:[t.contractId].filter(Boolean),causes:[t.sourceEvent],topic:'people'});s.flags.hiringMissed=(s.flags.hiringMissed||0)+1;s.threads.push({id:uid(s,'t'),type:'candidateReferral',due:s.q+3,sourceEvent:e.id,name:t.name});}}
 if(s.life?.version>=2&&t.planId){const plan=s.life.recruitPlans.find(p=>p.id===t.planId);if(plan&&t.fulfilled!==false){plan.filled++;plan.joinedMonth=s.calendarMonth;} }
 if(t.type==='annualRecruit'&&s.life?.version<2){s.life.recruitHistory.push({start:t.startMonth,end:s.calendarMonth,planned:1,filled:t.fulfilled?1:0,sourceEvent:t.sourceEvent});emit(s,'turning','1年間の採用計画を振り返る。',`計画1人、採用${t.fulfilled?1:0}人。実測の企業年間計画未達31.9%を、小規模1名計画へ移した推計。応募者ごとの失敗率ではありません。`,{causes:[t.sourceEvent],topic:'recruitPlan'});}
 if(t.type==='candidateReferral'&&rng(s)<.5){const name=candidate(s);emit(s,'turning',`採用できなかった${t.name}から、知人の話が届く。`,`${name}が転職を考えているという。採用できなかった縁が、別の入口になった。`,{causes:[t.sourceEvent],topic:'referral'});s.flags.candidateName=name;s.cooldowns.hiring=0;}
 if(t.type==='improve'){const member=s.people.find(p=>p.id===t.personId);if(member?.active){s.skill=round(s.skill+.1);s.fatigue=clamp(s.fatigue-22,0,100);emit(s,'turning',member.id===currentLeader(s)?.personId?`${member.name}のもとで、会社の役割分担が回り始めた。`:`${member.name}に任せた仕事が、回り始めた。`,'引継ぎから半年。処理能力が上がり、チームの負担も軽くなった。',{entities:[member.id],causes:[t.sourceEvent],topic:'people'});}}
 if(t.type==='maintenance'){const c=s.clients.find(c=>c.id===t.clientId);if(c?.active){c.value=round(c.value+70);emit(s,'turning',`${c.name}との大口開発が、保守の関係へ変わった。`,'あの開発でつながった相手と、毎期70万円分の仕事が続く。',{entities:[c.id,t.contractId],causes:[t.sourceEvent],topic:'relationship'});}}
 }
}
function quarter(prev,d=null,action=null){
 const s=structuredClone(prev),p=s.config.parameters;if(s.life?.version>=2)generationQuarter(s);const oldAr=receivables(s),startCash=s.cash,startDebt=s.debt,startIndex=s.events.length;s.q++;let special=s.prepaid||0,borrow=0,lowerDemand=1,capacityBonus=s.capacityOrder||0;const prepaid=s.prepaid||0;delete s.prepaid;delete s.capacityOrder;
 if(d){const r=apply(s,d,action);special=r.special;borrow=r.borrow;lowerDemand=r.lowerDemand;capacityBonus=r.capacityBonus;s.pending=null;}
 const due=s.threads.filter(t=>t.dueMonth===undefined&&t.due<=s.q);s.threads=s.threads.filter(t=>t.dueMonth!==undefined||t.due>s.q);
 processThreads(s,due);
 if(rng(s)>p.macroStay){const old=s.macro;s.macro=pick(s,[0,1,2]);if(old!==s.macro)emit(s,'world',['取引先も、予算に慎重になってきた。','街の仕事が、いつもの調子へ。','街に、新しい仕事の気配。'][s.macro],['景気の向かい風が、取引先全体の注文に影響する。','注文の基準が平常に戻る。','取引先全体の注文が上向きになった。'][s.macro],{major:false,topic:'world'});}
 const clients=activeClients(s);
 if(clients.length&&s.q>=(s.cooldowns.contract||0)&&rng(s)<p.contractionChance*(s.macro===0?1.6:1)){const c=pick(s,clients);const lost=round(c.value*.4);if(lost>10){c.value=round(c.value-lost);s.cooldowns.contract=s.q+3;emit(s,'risk',`${c.name}から、予算見直しの知らせ。`,`毎期の基準受注が${Math.round(lost)}万円分減った。${c.since===0?'創業時からの取引先だけに、影響は小さくない。':'一度つながった仕事も、そのままとは限らない。'}`,{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'client'});}}
 if(clients.length&&rng(s)<p.additionChance){const c=pick(s,clients);c.value=round(c.value+25);c.relation=clamp(c.relation+5,0,100);emit(s,'ordinary',`${c.name}から、いつもの仕事の続き。`,'取引を重ねるうち、基準受注が毎期25万円分増えた。',{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),major:false,topic:'relationship'});}
 if((!clients.length||rng(s)<(clients.length<3&&s.last.load<.8?p.underbookedPipelineChance:p.pipelineChance))&&(!s.life?.generations||clients.length<3||s.last.load<.7)&&s.q>=(s.cooldowns.pipeline||0)&&s.contacts.filter(c=>c.status==='available').length<1){s.cooldowns.pipeline=s.q+2;const source=clients.length?pick(s,clients):null;const e=emit(s,'turning',source?`${source.name}が、次の縁を運んできた。`:'まだ実績のない会社に、問い合わせが届いた。',source?'日々の仕事を見ていた相手が、知り合いの会社を紹介してくれた。':'活動を見つけた事業者が、開発の相談をしたいという。',{entities:source?[source.id]:[],causes:source?.sourceEvent?[source.sourceEvent]:[],topic:'referral'});const lead=contact(s,newName(s),{sourceId:source?.id,sourceEvent:e.id});e.entities.push(lead.id);}
 const running=s.contracts.filter(k=>k.active&&k.start<=s.q&&k.end>=s.q);const base=sum(clients.map(c=>c.value));if(s.workPlan&&s.workPlan.until>=s.q)lowerDemand*=s.workPlan.factor;const demand=round((base*[.79,1,1.16][s.macro]*(.9+rng(s)*.2)+sum(running.map(k=>k.value)))*lowerDemand);const external=running.filter(k=>k.outsource).length;const capacity=round((p.capacityPerPerson+sum(activeTeam(s).map(member=>personCapacity(s,member))))*s.skill*(1-s.fatigue/600)+external*180+capacityBonus)*(s.life?Math.max(0,1-s.life.quarterLostMonths/3):1);if(s.life)s.life.quarterLostMonths=0;const work=demand+s.backlog,revenue=round(Math.min(work,capacity)),load=work/Math.max(1,capacity);s.backlog=round(Math.max(0,work-capacity));s.fatigue=clamp(s.fatigue+(load>1.12?16:load>1?6:-9)+(s.style==='hands-on'?3:0)-(s.style==='companion'?3:0),0,100);s.trust=clamp(s.trust+(load<=1.15?1:-2),0,100);
 for(const member of activeTeam(s)){member.worked++;if(load>1.12)member.overloadPeriods++;member.strain=clamp(member.strain+(load>1.12?Math.min(25,8+(load-1)*15):-12),0,100);}
 if(load>1.18&&s.q>=(s.cooldowns.overwork||0)){s.cooldowns.overwork=s.q+3;emit(s,'risk','仕事はある。でも、机の向こうに余裕がない。',`処理能力に対する仕事量は${Math.round(load*100)}%。仕事の残りと疲れが積み重なり始めた。`,{entities:running.map(k=>k.id),causes:running.map(k=>k.sourceEvent),topic:'workload'});}
 if(s.backlog>Math.max(capacity,s.life?p.capacityPerPerson:0)*.8){s.backlog=round(Math.max(capacity,s.life?p.capacityPerPerson:0)*.8);s.trust=clamp(s.trust-7,0,100);}
 let collections=0,ar=[];for(const r of s.receivables){if(r.due<=s.q)collections+=r.amount;else ar.push(r);}const appliedAdvance=s.life?Math.min(revenue,s.life.advanceLiability):0;if(s.life)s.life.advanceLiability=round(s.life.advanceLiability-appliedAdvance);let now=round((revenue-appliedAdvance)*p.collectionShare),later=round(revenue-appliedAdvance-now),delayed=false;
 if(now>0&&clients.length&&s.q>=(s.cooldowns.delay||0)&&rng(s)<p.delayChance){const c=pick(s,clients);delayed=true;s.cooldowns.delay=s.q+3;ar.push({amount:now,due:s.q+1});const value=now;now=0;emit(s,'risk',`${c.name}を含む取引先の入金が、次の季節へ。`,`当期回収予定の${Math.round(value)}万円が遅れた。納品した売上は消えないが、支払いに使える現金は減る。`,{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'finance'});}
 collections=round(collections+now);if(later>0)ar.push({amount:later,due:s.q+1});s.receivables=ar;
 const operating=round(costs(s)+special+external*90),interest=round(s.debt*p.quarterlyInterest),repay=round(Math.min(p.quarterlyPrincipal,s.debt)),profit=round(revenue-operating-interest);s.cash=round(startCash+collections+borrow-operating+prepaid-interest-repay);s.debt=round(s.debt-repay);
 for(const k of running.filter(k=>k.end===s.q)){
 k.active=false;const c=s.clients.find(c=>c.id===k.clientId);
 if(k.kind==='trial'){const lead=s.contacts.find(l=>l.id===k.leadId);if(load<1.3&&rng(s)<p.trialConversionChance+(k.conversionBonus||0)){c.value=round(k.continuationValue??160+s.experience*3);c.relation=65;lead.status='won';emit(s,'turning',`${c.name}が、「次もお願いしたい」と言ってくれた。`,`試作から、毎期約${Math.round(c.value)}万円を基準にした継続取引へつながった。`,{entities:[c.id,lead.id,k.id],causes:[k.sourceEvent],topic:'client'});}else{c.active=false;lead.status='lost';const e=emit(s,'ordinary',`${c.name}との試作は、ひとまずここまで。`,'納品の売上は残ったが、今回は継続契約に至らなかった。',{entities:[c.id,lead.id],causes:[k.sourceEvent],topic:'client'});followup(s,lead.id,e.id);}}
 else emit(s,'turning',`${c.name}の大口受注期間が、一区切り。`,`${k.duration}四半期の追加受注が終わった。${s.backlog>0?'会社には、まだ納めきれていない仕事がある。':''}${k.hireSource?(s.people.some(p=>p.sourceEvent===k.sourceEvent&&p.active)?'この受注をきっかけに採用した仲間の給与は、仕事が終わっても続く。':'仲間を探しながら進めた開発が、会社の経歴に残った。'):k.outsource?'案件に付随した外注費も、ここで終わる。':'会社には、この仕事を引き受けた記録が残る。'}`,{entities:[c.id,k.id],causes:[k.sourceEvent],topic:'contract'});
 }
 for(const c of activeClients(s)){c.relation=clamp(c.relation+(load<1.15?2:-2),0,100);if(s.q-c.since===8)emit(s,'turning',`${c.name}と、2年を重ねた。`,'新しい受注だけでなく、同じ相手と約束を続けた時間も、この会社の歴史になった。',{entities:[c.id],causes:[c.sourceEvent].filter(Boolean),topic:'relationship'});}
 if(activeTeam(s).length&&s.q>=(s.cooldowns.departure||0)&&rng(s)<p.departureChance+(activeTeam(s).some(m=>m.strain>75)?.1:0)){const pool=activeTeam(s).filter(p=>p.worked>=2&&p.id!==currentLeader(s)?.personId);if(pool.length){const member=pick(s,pool);s.cooldowns.departure=s.q+4;leave(s,member,joinCause(s,member),member.strain>75?`本人の負担が${Math.round(member.strain)}/100まで高まり、${member.overloadPeriods*3}か月の繁忙を経て、働き方を続けられないと相談して`:'本人から退職の申し出があり、話し合って（詳しい個人事情は記録されていません）');}}
 if(s.life){if(s.cash<0)s.life.needsRescue=true;if(s.calendarMonth>0&&s.calendarMonth%60===0)s.checkpoint=s.calendarMonth;}else if(s.cash<0){s.ended='insolvent';emit(s,'ending','この季節の支払いを、つなげなかった。','四半期末の現金が不足し、会社の経営はここで止まった。ここまでに生まれた仕事や関係は記録に残る。',{topic:'ending'});}else if(s.q>=20)s.ended='five-years';
 for(const t of due.filter(t=>t.type==='workReview')){const retained=t.clientIds.filter(id=>s.clients.some(c=>c.id===id&&c.active));const member=t.personId?s.people.find(p=>p.id===t.personId):null;emit(s,'turning','仕事を絞ったあと、会社はこう変わった。',`調整前の仕事量${Math.round(t.beforeLoad*100)}%から、今期は${Math.round(load*100)}%。${retained.length}社との取引が続いている。${member?`${member.name}は${member.active?'今も一緒に働いている。':'その後、会社を離れた。'}`:''}`,{entities:[...retained,...(member?[member.id]:[])],causes:[t.sourceEvent],topic:'response'});}
 const events=s.events.slice(startIndex);s.last={revenue,profit,operating,interest,repay,borrow,collections,oldAr,newAr:receivables(s),startCash,startDebt,deltaCash:round(s.cash-startCash),load:round(load),demand,capacity,delayed,special,prepaid,external:external*90,capacityBonus,appliedAdvance,events};s.history.push({q:s.q,cash:s.cash,debt:s.debt,staff:staff(s),activeClientIds:activeClients(s).map(c=>c.id),activePersonIds:activeTeam(s).map(p=>p.id),fatigue:s.fatigue,chapter:chapter(s),...structuredClone(s.last)});return s;
}
export function advance(prev,maxQuarters=3){if(!Number.isInteger(maxQuarters)||maxQuarters<1||maxQuarters>3)throw Error("進行幅が不正です");if(prev.model!==MODEL)throw Error('この記録は閲覧用です');if(prev.ended)throw Error('終了済みです');if(prev.pending)throw Error('この節目の判断を選んでください');let s=structuredClone(prev);const start=s.history.length;s.batch=[];for(let i=0;i<maxQuarters&&!s.ended;i++){if(discover(s))break;s=quarter(s);if(s.last.events.some(e=>e.major)||problems(s).length)break;}s.batch=s.history.slice(start).map(h=>h.q);return s;}
export function resolve(prev,choiceId){if(!prev.pending||prev.ended||prev.model!==MODEL)throw Error('判断待ちの局面がありません');let s=quarter(prev,prev.pending,choiceId);if(s.deferredDecision&&!s.ended){const deferred=s.deferredDecision;const target=s.contracts.find(k=>k.id===deferred.entityId);if(deferred.type!=='renewal'||target?.active){deferred.at=s.q+1;s.pending=deferred;}else emit(s,'ordinary','対処を進める間に、案件の期限を迎えた。',deferred.title+' 大口開発は予定どおり終了した。',{entities:[deferred.entityId],causes:deferred.causes,topic:'contract'});}delete s.deferredDecision;delete s.helpReturnSerial;s.batch=[s.q];return s;}

export function close(prev){const s=structuredClone(prev);s.ended='closed';s.pending=null;emit(s,'ending','ここで、ひとつの区切りを選んだ。','続ける道だけでなく、自分で区切る判断も、この会社の一部。',{topic:'ending'});return s;}
export function restore(raw){const s=JSON.parse(raw);if(s.model!==MODEL)throw Error('この記録は別の版です。元の記録を書き出して保管できます。');validate(s.config);if(!Number.isInteger(s.q)||s.q<0||!Number.isSafeInteger(s.q)||!Number.isFinite(s.cash)||!Number.isInteger(s.rng)||!Array.isArray(s.people)||!Array.isArray(s.events)||!Array.isArray(s.history)||!Array.isArray(s.threads)||!Array.isArray(s.contacts)||!s.origin||!s.config.origins.some(o=>o.id===s.originId)||!s.last||!s.initial||!s.people.every(p=>typeof p.name==='string'&&Number.isFinite(p.salary)))throw Error('記録の形式が不正です。元のデータは削除していません。');if(s.pending&&(!s.pending.options?.length||s.pending.at!==s.q+1))throw Error('判断待ちの記録を読み込めません。');normalizeLifeOptions(s);return s;}
export function reflection(s){
 const notes=[],left=s.people.filter(p=>!p.active),joined=s.people.filter(p=>!p.founding),returned=staff(s)===s.initial.staff&&left.length&&joined.length;
 if(returned)notes.push({title:'同じ人数に、違う道のりで。',text:`${left.map(p=>p.name).join('、')}との別れと、${joined.map(p=>p.name).join('、')}の入社を経験した。創業時と今は同じ${staff(s)+1}人でも、同じチームではない。`,entities:[...left,...joined].map(p=>p.id)});
 else if(left.length)notes.push({title:'一緒に始めて、別々の道へ。',text:`${left.map(p=>p.name).join('、')}と働いた時間が残っている。${joined.length?`この間に、${joined.map(p=>p.name).join('、')}が新しい仲間になった。`:'その後は、残った体制で仕事に向き合った。'}`,entities:left.map(p=>p.id)});
 const referred=s.events.find(e=>e.topic==='referral'&&e.causes.some(id=>s.events.some(p=>p.id===id&&(p.topic==='inquiry'||p.kind==='risk'||p.topic==='large'))));
 if(referred){const cause=s.events.find(e=>e.id===referred.causes[0]);notes.push({title:'つながらなかった話にも、続きがあった。',text:`「${cause.title}」という出来事から、「${referred.title}」へ。抽選の結果だけで終わらず、後の縁になった。`,entities:referred.entities});}
 const large=s.contracts.find(k=>k.kind==='large'&&k.hireSource);if(large){const c=s.clients.find(c=>c.id===large.clientId),people=s.people.filter(p=>p.sourceEvent===large.sourceEvent);notes.push({title:people.length?'あの受注が、会社の体制を変えた。':'受けた仕事と、採用の難しさ。',text:`${c.name}の大口開発を受けて、採用に踏み出した。${people.length?`${people.map(p=>p.name).join('、')}が加わり、${large.active?'今も仕事を進めている。':'案件が終わった後にも、その人と働いた経緯が残った。'}`:'仲間を探すことと、仕事の時期が合うとは限らなかった。'}`,entities:[c.id,...people.map(p=>p.id)]});}
 const loyal=activeClients(s).filter(c=>s.q-c.since>=8).sort((a,b)=>a.since-b.since)[0];if(loyal)notes.push({title:'大きくなる以外にも、重ねたもの。',text:`${loyal.name}と${Math.floor((s.q-loyal.since)*3)}か月。${loyal.renewed?'関係を続ける形を考え、選んだ。':'毎期の仕事を重ね、関係が残った。'}`,entities:[loyal.id]});
 if(s.flags.delegation)notes.push({title:s.style==='delegated'?'任せ合う会社へ進んだ。':'現場に立つことを選んだ。',text:s.style==='delegated'?`${s.people.find(p=>p.role==='開発のまとめ役')?.name||'仲間'}に仕事を任せ、社長ひとりに集中していた体制が変わった。`:'人が増えた後も、自分が開発の中心に立ち続ける道を選んだ。',entities:[]});
 if(!notes.length)notes.push({title:activeClients(s).length?'ひとつずつ、信頼を重ねた。':'最初の信頼を探し続けた。',text:activeClients(s).length?`${activeClients(s).map(c=>c.name).slice(0,3).join('、')}との仕事が、今の会社につながっている。`:'問い合わせや交渉を重ねたが、継続する顧客にはまだ届かなかった。その時間も、この会社が経験したこと。',entities:[]});return notes.slice(0,4);
}

function setWorkPlan(s,factor,cause,personId=null){
 s.workPlan={factor,until:s.q+1,sourceEvent:cause};
 s.threads.push({id:uid(s,'t'),type:'workReview',due:s.q+2,sourceEvent:cause,personId,beforeLoad:s.last.load,clientIds:activeClients(s).map(c=>c.id)});
}
export function problems(s){
 if(s.ended||s.model!==MODEL)return [];
 const out=[];
 if(s.last.load>1.1||s.backlog>(s.last.capacity||1)*.2||s.fatigue>50)out.push({id:'workload',title:'仕事の積み残しに対処する',text:`仕事量${Math.round(s.last.load*100)}%・未完了${Math.round(s.backlog)}万円分。相談を待たずに、受注量や体制を見直せます。`});
 if(s.cash<costs(s)*1.3&&(s.debt<=900||staff(s)))out.push({id:'finance',title:'次の支払いに備える',text:`手元${Math.round(s.cash)}万円、通常費用${Math.round(costs(s))}万円/期。資金調達や体制の縮小を検討できます。`});
 return out;
}
export function requestHelp(prev,kind){
 if(prev.checkpoint||['cyber','rescue','exit','successor','strategy','handover'].includes(prev.pending?.type))throw Error('今の判断を先に確認してください');
 if((!problems(prev).some(p=>p.id===kind)&&!(prev.timelineVersion&&!prev.ended&&kind==='workload'))||prev.pending?.initiated)throw Error('この対処は今は開けません');
 const s=structuredClone(prev);s.helpReturnSerial=s.serial;if(s.pending)s.deferredDecision=s.pending;
 const opts=[];
 if(kind==='workload'){
 opts.push(choice('adjust','今と次の季節は、受注を40%絞る',20,'調整費20万円。2四半期の新しい受注量を40%減らし、残った仕事を納める。','引き受ける売上は減る。すでに積み残した仕事が消えるわけではない。'));
 opts.push(choice('bridge','今期だけ、外の力を借りる',90,'今期の外注費90万円。処理能力を180万円分追加。','来期は元の体制に戻る。仕事が足りなくても費用は発生する。'));
 if(staff(s)<5&&!s.life?.recruitPlans?.some(p=>!p.closed)&&!s.threads.some(t=>['join','recruit','annualRecruit'].includes(t.type)))opts.push(choice('recruit','積み残しを減らす仲間を探す',35,'採用活動35万円。翌期に結果。成功すれば給与110〜155万円/期。','採用は確実ではない。入社後も、仕事に慣れる期間がある。'));
 }else{
 if(s.debt<=900)opts.push(choice('borrow','運転資金を300万円借りる',0,'今期の現金 +300万円。借入も300万円増える。','給与・利息・元本返済は続く。'));
 const member=activeTeam(s).filter(p=>p.id!==currentLeader(s)?.personId).at(-1);if(member)opts.push(choice('reduce',`${member.name}と別れ、体制を縮める`,45,`整理費45万円。今期から報酬${member.salary}万円と1人分の処理能力を減らす。`,'引き受けられる仕事の量も減る。'));
 if(!opts.length)throw Error('追加融資や人員縮小の余地がありません');
 }
 s.pending={id:uid(s,'d'),type:kind,title:kind==='workload'?'仕事の積み残しに、自分から手を打つ。':'次の支払いに、自分から備える。',text:kind==='workload'?`直近の仕事量は処理能力の${Math.round(s.last.load*100)}%。時間を進めず、今からの方針を登録します。`:'資金が尽きる前に、次の四半期の体制を選びます。',entityId:kind==='finance'?activeTeam(s).filter(p=>p.id!==currentLeader(s)?.personId).at(-1)?.id||null:null,at:s.q+1,options:opts,causes:s.events.filter(e=>e.topic===(kind==='workload'?'workload':'finance')).slice(-1).map(e=>e.id),initiated:true};normalizeLifeOptions(s);return s;
}
export function cancelHelp(prev){if(!prev.pending?.initiated)throw Error('対処の選択中ではありません');const s=structuredClone(prev);s.pending=s.deferredDecision||null;s.serial=s.helpReturnSerial;delete s.deferredDecision;delete s.helpReturnSerial;normalizeLifeOptions(s);return s;}

// Story extraction is read-only: every excerpt carries the people and preceding events it needs.
export function eventContext(s,ids){
 const out=new Map();
 function add(id){const e=s.events.find(e=>e.id===id);if(!e||out.has(id))return;out.set(id,e);for(const parent of e.causes||[])add(parent);
 for(const entity of e.entities||[]){const p=s.people.find(p=>p.id===entity);if(p&&e.q>=p.joined){const joined=joinCause(s,p);if(joined&&joined!==id)add(joined);if(p.founding)add(s.events.find(x=>x.kind==='start')?.id);}}
 }
 ids.forEach(add);return [...out.values()].sort((a,b)=>(a.month??a.q*3)-(b.month??b.q*3)||Number(a.id.slice(1))-Number(b.id.slice(1)));
}
export function storyChapters(s){
 const roots=[],used=new Set();
 const add=d=>{if(d&&!used.has(d.id)){roots.push(d);used.add(d.id);}};
 if(s.life){for(const type of ['exit','rescue','cyber'])add(s.decisions.findLast(d=>d.type===type));add(s.decisions.findLast(d=>['hire','recruit'].includes(d.choiceId)));}
 const adjustments=s.decisions.filter(d=>(d.type==='team'&&d.choiceId==='relieve')||(d.type==='workload'&&d.choiceId==='adjust'));
 add(adjustments.at(-1));
 const hires=s.decisions.filter(d=>d.type==='hiring'&&d.choiceId==='welcome');add(hires.at(-1));
 const trials=s.decisions.filter(d=>d.type==='inquiry'&&d.choiceId==='trial'&&s.contacts.some(c=>c.id===d.entityId&&c.status==='won'));add(trials.at(-1));
 add(s.decisions.find(d=>d.type==='large'&&d.choiceId!=='decline'));
 for(const d of s.decisions.slice().reverse())if(roots.length<(s.life?8:4))add(d);
 return roots.slice(0,s.life?8:4).sort((a,b)=>a.q-b.q).map(d=>{
 const descendants=s.events.filter(e=>(e.causes||[]).includes(d.eventId));
 const member=d.entityId?s.people.find(p=>p.id===d.entityId):s.people.find(p=>p.sourceEvent===d.eventId);
 const memberEvents=member?s.events.filter(e=>e.entities.includes(member.id)&&e.q>=member.joined):[];
 const before=s.events.filter(e=>e.topic==='workload'&&e.q<=d.q).slice(-1);
 const related=eventContext(s,[d.eventId,...descendants.map(e=>e.id),...memberEvents.map(e=>e.id),...((d.type==='hiring'||d.type==='workload'||d.type==='team')?before.map(e=>e.id):[])]);
 const outcomes=related.filter(e=>e.q>=d.q&&e.kind!=='choice'&&e.kind!=='start');
 return {decision:d,title:d.choice,events:related,outcomes,memberId:member?.id||null};
 });
}
export function reviewRecord(raw){const s=JSON.parse(raw);if(s.model!=='company-life-2'||!s.ended||!Array.isArray(s.events)||!Array.isArray(s.people)||!Array.isArray(s.decisions)||!s.config||!s.initial||!s.last)throw Error('旧版の完了した記録ではありません');return s;}

export const PATTERNS={
 expand_adjust:{label:'大口受注のあと、仕事を絞った会社',criteria:'大口受注を引き受け、その後6四半期以内に受注量を減らした。同じ創業境遇で、調整から2四半期後まで観測できた会社。',outcome:'調整から2四半期後も、その大口の取引先との関係が続いた'},
 hire_relieve:{label:'仲間を迎え、働き方を見直した会社',criteria:'創業後に入社した本人の相談を受け、受注を減らして継続を選択。同じ創業境遇で、その判断の2四半期後まで観測できた会社。',outcome:'判断から2四半期後も、その仲間と一緒に働いていた'},
 referral_trial:{label:'紹介から試作を引き受けた会社',criteria:'過去の取引先・相談相手から紹介を受けた会社の試作を受注。同じ創業境遇で、試作の2四半期後まで観測できた会社。',outcome:'試作から2四半期後、その紹介先と継続取引になっていた'}
};
export function experiencePatterns(s){
 const records=[];
 const observe=(key,d,entityId,kind)=>{const atMonth=d.month??s.events.find(e=>e.id===d.eventId)?.month;const h=atMonth!==undefined?s.history.find(h=>h.q*3>=atMonth+6):s.history.find(h=>h.q===d.q+2);if(!h)return;const ids=kind==='person'?h.activePersonIds:h.activeClientIds;if(!ids)return;records.push({key,at:d.q,atMonth:atMonth??d.q*3,observedMonth:h.q*3,observedAt:h.q,entityId,continued:h.cash>=0&&ids.includes(entityId),loadBefore:d.before?.load??s.history.find(h=>h.q===d.q-1)?.load??null,loadAfter:h.load});};
 const adjust=s.decisions.filter(d=>(d.type==='team'&&d.choiceId==='relieve')||(d.type==='workload'&&d.choiceId==='adjust'));
 for(const d of adjust){const large=s.decisions.filter(x=>x.type==='large'&&x.choiceId!=='decline'&&x.q<d.q&&d.q-x.q<=6).at(-1);if(large&&!records.some(r=>r.key==='expand_adjust'))observe('expand_adjust',d,large.entityId,'client');if(d.type==='team'){const member=s.people.find(p=>p.id===d.entityId&&!p.founding);if(member&&!records.some(r=>r.key==='hire_relieve'))observe('hire_relieve',d,member.id,'person');}}
 for(const d of s.decisions.filter(d=>d.type==='inquiry'&&d.choiceId==='trial')){const lead=s.contacts.find(c=>c.id===d.entityId&&c.sourceId);if(lead?.clientId&&!records.some(r=>r.key==='referral_trial'))observe('referral_trial',d,lead.clientId,'client');}
 return records;
}

// Timeline mode: decisions register now; only calendar ticks perform settlements.
export function prepareTimeline(prev){
 const s=structuredClone(prev);s.timelineVersion=1;s.calendarMonth??=s.q*3+(s.ui?.month||0);s.ui={phase:'observe',month:s.calendarMonth%3,summary:s.ui?.summary||false};
 if(!s.pending&&!s.ended&&!s.checkpoint)discover(s);normalizeLifeOptions(s);return s;
}
export function registerDecision(prev,id){
 if(!prev.pending||prev.ended)throw Error('判断待ちの相談がありません');
 const s=structuredClone(prev);normalizeLifeOptions(s);const d=s.pending,a=d.options.find(a=>a.id===id);if(!a)throw Error('相談の条件が変わりました。表示を確認してください');
 if(d.initiated&&(s.actionLocks||[]).includes(`${d.type}:${id}`))throw Error('この決算期間には登録済みです');
 if(!availableDecisionOptions(s).some(option=>option.id===id))throw Error('現在の資金・予定・受注条件では実行できません');
 if(id==='dismiss'){s.pending=s.deferredDecision||null;delete s.deferredDecision;normalizeLifeOptions(s);return s;}
 if(s.life&&['cyber','rescue','exit','successor','strategy','handover'].includes(d.type))return resolveLifeDecision(s,id);
 if(a.cost>s.cash)throw Error('確定費用を支払う資金が不足しています');
 const key=`${d.type}:${id}`;
 if(d.initiated&&(s.actionLocks||[]).includes(key))throw Error('この決算期間には登録済みです');
 if(s.life?.version>=2&&d.type==='hiring')return candidateDecision(s,id);
 if(['recruit','hire','welcome'].includes(id)&&s.threads.some(t=>['join','recruit','annualRecruit'].includes(t.type)))throw Error('採用活動・入社待ちがすでにあります');
 if(s.life?.version>=2&&['hire','recruit'].includes(id)&&s.life.recruitPlans.some(p=>!p.closed))throw Error('年間計画は進行中です。紹介候補の検討はできます');
 const oldContracts=s.contracts.length,oldThreads=s.threads.length;
 // Negotiation takes one month, instead of resolving in the click handler.
 let r;
 if(s.life&&['cyber','rescue','exit','successor','strategy','handover'].includes(d.type))return resolveLifeDecision(s,id);
 if(d.type==='inquiry'&&id==='negotiate'){
 const e=emit(s,'choice',a.title,'交渉を開始。1か月後に回答が届きます。',{entities:[d.entityId],causes:d.causes,topic:'inquiry'});
 s.decisions.push({id:d.id,q:s.q,...(s.calendarMonth!==undefined?{month:s.calendarMonth}:{}),type:d.type,choiceId:id,choice:a.title,eventId:e.id,entityId:d.entityId,before:{load:s.last.load}});
 s.contacts.find(c=>c.id===d.entityId).status='negotiating';s.threads.push({id:uid(s,'t'),type:'negotiation',dueMonth:s.calendarMonth+1,d,sourceEvent:e.id});r={special:a.cost,borrow:0,capacityBonus:0};
 }else r=apply(s,d,id);
 s.cash=round(s.cash-r.special+r.borrow);s.prepaid=round((s.prepaid||0)+r.special);s.capacityOrder=(s.capacityOrder||0)+r.capacityBonus;
 for(const k of s.contracts.slice(oldContracts)){k.start++;k.end++;}
 for(const t of s.threads.slice(oldThreads)){if(['join','recruit'].includes(t.type)){if(s.life&&t.type==='recruit')planRecruit(s,t);else t.dueMonth=s.calendarMonth+3;}}
 if(['adjust','relieve'].includes(id))s.workPlan.until=s.q+2;
 if(d.initiated)s.actionLocks=[...(s.actionLocks||[]),key];
 s.pending=s.deferredDecision||null;delete s.deferredDecision;delete s.helpReturnSerial;
 normalizeLifeOptions(s);return s;
}
export function tickMonth(prev){
 if(prev.pending||prev.ended||prev.checkpoint||prev.suspended)throw Error('時間を進められません');let s=structuredClone(prev);const eventStart=s.events.length,oldStaff=staff(s),oldClients=activeClients(s).length;s.calendarMonth++;
 if(s.life)lifeMonth(s);
 const due=s.threads.filter(t=>t.dueMonth<=s.calendarMonth);s.threads=s.threads.filter(t=>!(t.dueMonth<=s.calendarMonth));
 processThreads(s,due.filter(t=>t.type!=='negotiation'));
 for(const t of due.filter(t=>t.type==='negotiation')){
 const lead=s.contacts.find(c=>c.id===t.d.entityId);
 if(rng(s)<s.config.parameters.salesChance+s.experience*.008+(t.d.conversionBonus||0)){const c=client(s,lead.name,t.d.recurringValue??200,{sourceEvent:t.sourceEvent,sourceId:lead.id});lead.clientId=c.id;lead.status='won';emit(s,'turning',`${lead.name}との継続契約が決まった。`,`交渉への回答が届き、毎期${t.d.recurringValue??200}万円を基準にした取引が始まる。`,{entities:[c.id,lead.id],causes:[t.sourceEvent],topic:'client'});}
 else{lead.status='lost';const e=emit(s,'ordinary',`${lead.name}との交渉は契約に届かなかった。`,'予算が折り合わなかった。相談した縁は残る。',{entities:[lead.id],causes:[t.sourceEvent],topic:'client'});followup(s,lead.id,e.id);}
 }
 if(s.calendarMonth%3===0){s=quarter(s);s.actionLocks=[];}
 for(const e of s.events.slice(eventStart)){
 if(e.topic==='people'&&e.kind==='turning')e.context=`人数 ${oldStaff+1}人 → ${staff(s)+1}人。採用後も、慣れるまでの能力と給与の支払いは別々に増えます。`;
 if(e.topic==='client'&&e.kind==='turning')e.context=`継続顧客 ${oldClients}社 → ${activeClients(s).length}社。最大顧客の受注比率は${Math.round(concentration(s)*100)}%。これは自社の受注構成で、他社との順位ではありません。`;
 }
 s.ui={phase:'observe',month:s.calendarMonth%3};if(s.life){s.life.needsRescue=s.cash<0;if(s.life.needsRescue)openRescue(s);else if(!s.pending&&s.life.queue.length)s.pending=s.life.queue.shift();}lifeAfter(s);if(!s.ended&&!s.pending&&!s.checkpoint){if(!(s.life?.version>=2&&generationPrompt(s)))discover(s);}normalizeLifeOptions(s);return s;
}

function contextualInquiry(s,lead,source){
 const busy=s.last.load>1.1||s.backlog>100;
 const trusted=source?.active&&source.relation>=65;
 const retry=source&&['lost','passed','declined'].includes(source.status);
 const variant=busy?'limited':trusted?'trusted':retry?'reconnection':'first';
 const trialValue=busy?90:trusted?120:retry?100:180,recurringValue=trusted?240:retry?140:200;
 const reason=busy?`仕事量は処理能力の${Math.round(s.last.load*100)}%。${lead.name}は、まず一機能だけでも形にしたいという。今の体制で受ける範囲を絞れる。`:trusted?`${source.name}とは${Math.max(0,(s.calendarMonth??s.q*3)-(source.sinceMonth??source.since*3))}か月の関係。紹介先も実績を聞いていて、確認用の小さな試作か継続契約を相談できる。`:retry?`${source.name}とは前の相談が契約に至らなかった。それでも紹介してくれた${lead.name}は予算を抑えたい。小さく始める条件になっている。`:`${lead.name}にとって、まだ実績を確かめる前の相手。試作を見てから継続を考えたいという。`;
 const options=[choice('trial',busy?'一機能に絞って引き受ける':trusted?'確認用の短い試作を受ける':retry?'予算に合わせた試作を受ける':'試作で、まず実績を見せる',busy?8:trusted?8:retry?5:10,`準備費${busy?8:trusted?8:retry?5:10}万円。次の決算までに${trialValue}万円分の試作を受注。継続すれば毎期${recurringValue}万円が基準。`,'納品能力が足りなければ、継続につながらないことがある。')];
 if(!busy)options.push(choice('negotiate',trusted?'紹介の実績をもとに継続契約を提案する':'継続する範囲と予算を交渉する',trusted?8:15,`交渉費${trusted?8:15}万円。毎期${recurringValue}万円規模を提案し、1か月後に回答。`,'合意できない場合も、交渉費は戻らない。'));
 options.push(choice('pass',busy?'積み残しを優先し、今回は見送る':'今回は見送り、連絡先を残す',0,'費用なし。仕事を増やさず、相談した縁を記録に残す。','受注は得られない。後日の紹介は確実ではない。'));
 decision(s,'inquiry',`${lead.name}から、${busy?'範囲を絞った開発':trusted?'紹介を踏まえた継続':retry?'予算を抑えた試作':'初めての開発'}の相談。`,reason,lead.id,options,[lead.sourceEvent].filter(Boolean));
 Object.assign(s.pending,{variant,trialValue,recurringValue,conversionBonus:s.life?0:trusted?.08:0});return true;
}

// 0.7 lifetime model. Cohort observations drive occurrence; response contracts remain explicit assumptions.
export function startLife(prev,config=prev.config){
 const s=structuredClone(prev);s.config=structuredClone(config);s.calendarMonth??=s.q*3;s.timelineVersion=1;
 if(s.life)return s;
 s.life={version:1,streams:{},queue:[],backup:false,insurance:false,advanceLiability:0,quarterLostMonths:0,recoveryUntil:0,incidents:[],recruitHistory:[],cashMovements:[],exposure:{high:0,low:0},companyStatus:'active',managementStatus:'active',programmeDue:null,exitPlan:null,needsRescue:false,observedFrom:s.calendarMonth};
 s.life.securityGroup=randomChannel(s,'origin-security')<485/2775?'high':'low';
 if(s.ended==='five-years'){s.ended=null;s.checkpoint=s.calendarMonth;s.ui={phase:'observe',month:0};}
 if(s.calendarMonth>0)emit(s,'start','会社の時間を、長く見届ける。',`情報管理の出発点は${s.life.securityGroup==='high'?'組織的な運用がある':'属人的な運用が多い'}会社。IPAの小規模企業群を参考にした推計で、診断そのものではありません。5年ごとに振り返り、その後も続けられます。`,{topic:'life'});
 normalizeLifeOptions(s);return s;
}
function normalizeLifeOptions(s){if(s.life?.version>=2){const leader=s.people.find(p=>p.id===currentLeader(s)?.personId&&p.active);if(leader)leader.role='代表兼開発';}if(!s.life||!s.pending)return;s.pending.at=s.q+1;if(s.life.version>=2){generationOptions(s);return;}for(const a of s.pending.options){if(['hire','recruit'].includes(a.id)){a.desc='年間採用計画1人。活動費35万円を今支払い、12か月後に計画結果を確認。入社すれば給与が発生。';a.effect='49人以下の採用実施企業の年間計画未達31.9%を、1名計画へ移した推計。候補者個人の確率ではない。';}}}
function planRecruit(s,t){t.type='annualRecruit';t.startMonth=s.calendarMonth;t.dueMonth=s.calendarMonth+12;t.fulfilled=annualRecruitOutcome(randomChannel(s,'recruit-plan'));if(s.life.version>=2){t.planId=t.id;t.dueMonth=s.calendarMonth+(t.fulfilled?hiringMonth(randomChannel(s,'recruit-timing')):12);s.life.recruitPlans.push({id:t.id,start:s.calendarMonth,review:s.calendarMonth+12,planned:1,filled:0,expected:t.fulfilled,joinDue:t.fulfilled?t.dueMonth:null,sourceEvent:t.sourceEvent,path:'open-market',closed:false});}}
function charge(s,amount,reason){if(!amount)return;s.cash=round(s.cash-amount);s.prepaid=round((s.prepaid||0)+amount);s.life.cashMovements.push({month:s.calendarMonth,amount:-amount,reason});}
function lifePending(s,type,title,text,options,entityId=null,causes=[]){if(s.pending)s.life.queue.unshift(s.pending);s.pending={id:uid(s,'d'),type,title,text,options,entityId,causes,at:s.q+1};}
export function policyOptions(s){if(!s.life||s.ended)return [];
 const list=[];
 if(!s.life.backup)list.push({id:'backup',title:'隔離バックアップと復元手順を用意',cost:A.backupCost,desc:`導入${A.backupCost}万円、維持${A.backupMonthly}万円/月。発生率は変えず、復元を選べるようにする。`});
 if(!s.life.insurance)list.push({id:'insurance',title:'サイバー保険を契約',cost:0,desc:`保険料${A.insuranceMonthly}万円/月。事故の発生率は変わらない。免責${A.insuranceExcess}万円超の対象復旧費の80%を翌月補填。`});
 if(s.life.securityGroup==='low'&&!s.life.programmeDue)list.push({id:'programme',title:'情報管理を3か月かけて整備',cost:A.programmeCost,desc:'担当・更新・権限・周知を整える。以後は高得点群を参照する推計。実測された因果効果ではない。'});
 if(!s.life.advanceLiability&&activeClients(s).length)list.push({id:'advance',title:'既存顧客と前受金を取り決める',cost:0,desc:'基準受注の30%を先に受け取り、売上ではなく前受金として保持。納品時に充当し、未回収になる額を減らす。相手の事故率は変わらない。合意成立はモデル上の仮定。'});
 if(receivables(s)>0)list.push({id:'factor',title:'入金待ちの債権を現金化',cost:0,desc:'売掛金を全額譲渡し、5%の費用を引いて回収。利益をもう一度計上しない。引受成立と手数料は仮定。'});
 return list;
}
export function setPolicy(prev,id){const s=structuredClone(prev),a=policyOptions(s).find(a=>a.id===id);if(!a||s.pending||s.checkpoint)throw Error('いまはこの備えを変更できません');if(s.cash<a.cost)throw Error('手元資金が足りません');charge(s,a.cost,a.title);
 if(id==='backup')s.life.backup=true;if(id==='insurance')s.life.insurance=true;if(id==='programme')s.life.programmeDue=s.calendarMonth+A.programmeMonths;
 let detail=a.desc;
 if(id==='advance'){const amount=round(activeClients(s).reduce((n,c)=>n+c.value,0)*A.depositShare);s.cash=round(s.cash+amount);s.life.advanceLiability=amount;s.life.cashMovements.push({month:s.calendarMonth,amount,reason:'前受金（負債）'});detail=`${amount}万円を前受け。未納品の間は返金義務が残り、売上・利益には含めない。`+a.desc;}
 if(id==='factor')detail=cashClaims(s)+a.desc;
 const e=emit(s,'choice',a.title,detail,{topic:'preparation'});s.life.preparations||={};s.life.preparations[id]=e.id;return s;
}
function cashClaims(s){const amount=receivables(s),fee=round(amount*A.factorFee);s.cash=round(s.cash+amount);s.receivables=[];charge(s,fee,'売掛債権の現金化費用');return `${amount}万円の債権を現金化、費用${fee}万円。`;}
function lifeMonth(s){const l=s.life;if(l.version>=2)generationMonth(s);
 charge(s,(l.backup?A.backupMonthly:0)+(l.insurance?A.insuranceMonthly:0),'備えの月額費用');
 if(l.programmeDue&&s.calendarMonth>=l.programmeDue){l.programmeDue=null;l.securityGroup='high';emit(s,'turning','情報管理の手順が、会社の日常になった。','担当・更新・権限・共有の運用を整備。以後は診断70点以上群を参照する推計を採用。施策の因果効果の実測ではない。',{topic:'cyber'});}
 if(l.claimDue&&l.claimDue<=s.calendarMonth){s.cash=round(s.cash+l.claimAmount);s.prepaid=round((s.prepaid||0)-l.claimAmount);emit(s,'ordinary','保険の補填が入金された。',`${l.claimAmount}万円を受領。復旧費の自己負担を減らしたが、事故や停止期間は取り消されない。`,{topic:'cyber',causes:[l.claimSource]});l.claimDue=null;l.claimAmount=0;}
 if(l.version>=2)advanceRecoveries(s);else{
 if(l.recoveryUntil&&s.calendarMonth<=l.recoveryUntil)l.quarterLostMonths+=l.recoveryLoss??1;
 if(l.recoveryUntil&&s.calendarMonth>=l.recoveryUntil){emit(s,'turning','業務を再開できた。',`復旧方法に応じた停止を経て再開。停止中の納品能力は決算に反映される。${l.backup?'事前の隔離バックアップが復元の選択肢を残した。':''}`,{topic:'cyber',causes:[l.recoverySource]});l.recoveryUntil=0;l.recoveryLoss=0;}
 }
 l.exposure[l.securityGroup]++;const u=randomChannel(s,'cyber-arrival'),v=randomChannel(s,'cyber-impact'),trial=cyberTrial(l.securityGroup,u,v);
 if(trial.incident&&l.lastIncidentYear!==Math.floor((s.calendarMonth-1)/12)){l.lastIncidentYear=Math.floor((s.calendarMonth-1)/12);const severity=randomChannel(s,'cyber-severity'),leak=(l.version>=2?randomChannel(s,'cyber-leak'):severity)<A.leakShare,incident={id:uid(s,'incident'),month:s.calendarMonth,group:l.securityGroup,annual:trial.annual,monthly:trial.monthly,noImpact:trial.noImpact,leak,backup:l.backup,insurance:l.insurance};l.incidents.push(incident);if(l.version>=2){newIncident(s,incident,severity);}else{
 const e=emit(s,trial.noImpact?'ordinary':'risk','サイバーインシデントの兆候を検知した。',trial.noImpact?'調査した範囲では業務への影響は確認されなかった。発生と被害は別の抽選。':'影響の調査で'+(leak?'情報流出の疑いと業務停止が判明。顧客への連絡も必要になった。':'業務システムが停止。復旧の方法を選ぶ必要がある。'),{topic:'cyber',causes:Object.values(l.preparations||{})});incident.eventId=e.id;
 if(!trial.noImpact){const opts=[choice('expert','専門家に調査・再構築を依頼',A.expertCost,'復旧45万円、停止1か月。給与・固定費は続く。','流出の有無や取引への影響は別に残る。'),choice('rebuild','自分たちで環境を再構築',10,'復旧費10万円、停止3か月。','費用は低いが、納品が止まる期間が長い。')];if(incident.backup)opts.unshift(choice('restore','隔離バックアップから復元',5,'復旧費5万円、停止1か月。','バックアップは流出した情報を取り戻すものではない。'));
 lifePending(s,'cyber','止まった仕事を、どう復旧する？','発生・影響なしの割合はIPAの群別観測から推計。流出の内訳、費用、停止日数、保険条件は仮定。備えは発生を防いだ扱いにはしません。',opts,incident.id,[e.id]);}
 }
 }
 for(const t of s.threads.filter(t=>t.type==='annualRecruit'&&s.calendarMonth===t.startMonth+3))emit(s,'ordinary','採用計画の途中経過。',`${t.name}との縁も含め、1名の募集を続けている。募集を続けている間も、紹介候補の検討や計画の切り替えができる。`,{topic:'people',causes:[t.sourceEvent]});
 if(l.exitPlan&&s.calendarMonth>=l.exitPlan.due)l.exitReady=true;
 if(s.cash<0)l.needsRescue=true;
}
function openRescue(s){if(s.pending?.type==='rescue')return;const gap=Math.max(0,-s.cash),opts=[];
 if(receivables(s)*(1-A.factorFee)>=gap&&receivables(s)>0)opts.push(choice('collect','売掛金を現金化して支払いをつなぐ',0,'5%の費用を引いて現金化。将来の回収を先に使う。','次回の入金は減る。引受成立はモデル上の仮定。'));
 if(s.debt<=900&&gap<A.rescueLimit)opts.push(choice('rescueLoan','追加借入で再建の時間を確保する',0,'現金・借入とも300万円増加。','採算が戻らなければ返済と固定費が残る。融資可否はこのモデルの条件式。'));
 opts.push(choice('liquidate','再建を断念し、清算へ進む',0,'会社の活動を終える。未回収・債務・前受金を記録する。','会社の終了。手続きや債権者配当を詳細には再現しない。'));
 lifePending(s,'rescue','支払いをつなぐ資金が不足している。',`不足${round(gap)}万円。倒産の追加抽選は行いません。債権の現金化や融資の条件を満たすかを確認します。`,opts);
}
export function requestExit(prev){const s=structuredClone(prev);if(s.life?.version>=2)return companyExit(s);if(!s.life||s.ended||s.pending||s.life.exitPlan)throw Error('進行中の判断・引継ぎを先に確認してください');
 const opts=[choice('observe','経営を続けたまま、今回の観測を終える',0,'会社も自分の経営も継続。後から再開できる。','これは廃業ではない。')];
 if(s.cash+receivables(s)-s.debt-s.life.advanceLiability>=45)opts.push(choice('voluntary','会社を自主廃業する',45,'債権を回収し、借入と前受金を精算する簡略モデル。','黒字でも選べる。会社を閉じるため再開しない。'));
 if(activeTeam(s).some(p=>s.calendarMonth-(p.joinedMonth??p.joined*3)>=12))opts.push(choice('succession','社員への承継を相談する',30,'6か月かけて引継ぎを協議。成立すれば自分は退任し、会社は続く。','合意は保証されない。成立65%は仮定。'));
 opts.push(choice('sale','第三者への売却を相談する',30,'6か月かけて条件を協議。成立すれば会社を残して退任。','成立50%と価格式は仮定。買い手が見つからない場合は経営を継続。'));
 opts.push(choice('stay','今は経営を続ける',0,'何も変えずに戻る。','追加支出なし。'));lifePending(s,'exit','会社と、自分の経営の区切りを考える。','廃業・承継・売却・観測終了は異なる結末です。家族など、まだ登場していない後継者を自動で成立させることはしません。',opts);return s;
}
function resolveLifeDecision(s,id){if(s.life.version>=2&&['exit','successor','strategy','handover'].includes(s.pending.type))return generationDecision(s,id);const d=s.pending,a=d.options.find(a=>a.id===id);if(!a)throw Error('選択できません');if(a.cost>Math.max(0,s.cash)&&d.type!=='cyber')throw Error('資金が足りません');
 const e=emit(s,'choice',a.title,a.desc,{topic:d.type,causes:d.causes});s.decisions.push({id:d.id,q:s.q,month:s.calendarMonth,type:d.type,choiceId:id,choice:a.title,eventId:e.id,entityId:d.entityId,before:{load:s.last.load}});charge(s,a.cost,a.title);s.pending=null;
 if(d.type==='cyber'){const incident=s.life.incidents.find(i=>i.id===d.entityId);const months=id==='rebuild'?A.rebuildMonths:A.restoreMonths;if(s.life.version>=2)addRecovery(s,incident,months,e.id);else{s.life.recoveryLoss=incident.loss??1;s.life.recoveryUntil=Math.max(s.life.recoveryUntil,s.calendarMonth+months);s.life.recoverySource=e.id;}incident.response=id;incident.cost=a.cost;incident.downtime=months;
 if(incident.leak){s.trust=clamp(s.trust-8,0,100);const c=activeClients(s)[0];if(c){c.relation=clamp(c.relation-10,0,100);emit(s,'risk',`${c.name}へ、情報流出の疑いを連絡した。`,'確認と説明が必要になり、関係の信頼値が下がった。復元や保険とは別の影響。変化量は仮定。',{entities:[c.id],causes:[incident.eventId,e.id],topic:'client'});}}
 const claim=incident.insurance?round(Math.max(0,a.cost-A.insuranceExcess)*A.insuranceShare):0;if(claim){s.life.claimDue=s.calendarMonth+1;s.life.claimAmount=(s.life.claimAmount||0)+claim;s.life.claimSource=e.id;}incident.claim=claim;
 }
 if(d.type==='rescue'){s.life.needsRescue=false;if(id==='collect')emit(s,'turning','債権を現金化し、再建を続ける。',cashClaims(s),{topic:'finance',causes:[e.id]});if(id==='rescueLoan'){s.cash=round(s.cash+300);s.debt=round(s.debt+300);}if(id==='liquidate')finishLife(s,'liquidated',e.id);}
 if(d.type==='exit'){if(id==='observe')finishLife(s,'observed',e.id);if(id==='voluntary'){s.cash=round(s.cash+receivables(s)-s.debt-s.life.advanceLiability);s.receivables=[];s.debt=0;s.life.advanceLiability=0;finishLife(s,'voluntary',e.id);}if(['succession','sale'].includes(id))s.life.exitPlan={type:id,due:s.calendarMonth+A.transferMonths,sourceEvent:e.id,success:randomChannel(s,'transfer')<(id==='sale'?A.saleChance:A.successionChance),personId:id==='succession'?activeTeam(s).find(p=>s.calendarMonth-(p.joinedMonth??p.joined*3)>=12)?.id:null};}
 if(!s.ended){if(s.cash<0){s.life.needsRescue=true;openRescue(s);}else if(s.life.queue.length)s.pending=s.life.queue.shift();}normalizeLifeOptions(s);return s;
}
function finishLife(s,reason,cause){s.ended=reason;s.life.companyStatus=['liquidated','voluntary'].includes(reason)?'closed':s.life.version>=2&&['sold','merged'].includes(reason)?'integrated':'active';s.life.managementStatus=['succession','sold','merged'].includes(reason)?'retired':reason==='observed'?'active':'ended';s.pending=null;s.checkpoint=null;s.ui={phase:'observe',month:s.calendarMonth%3};emit(s,'ending',({liquidated:'再建を断念し、会社を清算する。',voluntary:'自主廃業という区切りを選んだ。',succession:'仲間へ会社を託し、経営を退いた。',sold:'会社を第三者へ譲り、経営を退いた。',merged:'会社を新しい組織へ統合した。',observed:'会社が続く途中で、観測を終えた。'})[reason],`会社：${s.life.companyStatus==='active'?'継続':s.life.companyStatus==='integrated'?'他社・新会社へ統合':'終了'}。自分の経営：${s.life.managementStatus==='active'?'継続':s.life.managementStatus==='retired'?'退任':'終了'}。勝敗の順位は付けない。`,{topic:'ending',causes:cause?[cause]:[]});}
function lifeAfter(s){if(!s.life)return;const l=s.life;if(l.version>=2){generationAfter(s);normalizeLifeOptions(s);return;}
 if(l.exitReady&&!s.pending&&!l.needsRescue){const p=l.exitPlan;const eligible=p.type!=='succession'||s.people.some(m=>m.id===p.personId&&m.active);if(p.success&&eligible&&s.cash>=0){if(p.type==='sale')l.ownerProceeds=round(Math.max(0,s.cash+receivables(s)-s.debt-l.advanceLiability)+Math.max(0,s.last.profit)*4);finishLife(s,p.type==='sale'?'sold':'succession',p.sourceEvent);}else emit(s,'turning','引継ぎの協議は、成立しなかった。','相手の条件や体制が合わず、会社と自分の経営は続く。協議費は戻らない。',{topic:'succession',causes:[p.sourceEvent]});l.exitPlan=null;l.exitReady=false;}
 normalizeLifeOptions(s);
}
export function continueLife(prev){const s=structuredClone(prev);if(s.suspended){s.suspended=false;s.ui={phase:'observe',month:s.calendarMonth%3};}else if(s.ended==='observed'){s.ended=null;s.ui={phase:'observe',month:s.calendarMonth%3};}else if(s.checkpoint){s.checkpoint=null;s.ui={phase:'observe',month:s.calendarMonth%3};}else throw Error('この記録は再開できません');return s;}

// 0.8: company continuity. Statistics are comparison references, not succession lotteries.
export function evolveCompany(prev){const s=structuredClone(prev);if(!s.life)throw Error('継続観測の記録が必要です');if(s.life.version>=2)return s;const l=s.life;l.version=2;l.recruitPlans=[];l.savedCandidates=[];l.family=[];l.generations=[{number:1,name:s.ended==='succession'?'承継者（旧記録に氏名なし）':s.founder?.name||'創業者',personId:null,start:s.ended==='succession'?s.calendarMonth:0,policy:'maintain',baseline:companySnapshot(s),reviews:[]}];l.strategy=null;l.organised=false;l.strategyCooldown=0;l.handover=null;l.generations[0].baselineLabel=s.calendarMonth?'0.8移行時':'創業時';if(s.ended==='succession'){const successor=l.generations[0];successor.number=2;successor.baselineLabel='承継・移行時';l.generations.unshift({number:1,name:'創業者',personId:null,start:0,end:s.calendarMonth,policy:'maintain',baseline:{month:0,cash:s.initial.cash,debt:s.initial.debt,revenue:0,profit:0,periodMonths:0,staff:s.initial.staff+1,people:s.initial.people,clients:s.initial.clients,contracts:[],threads:[]},baselineLabel:'創業時',reviews:[]});}
 for(const t of s.threads.filter(t=>t.type==='annualRecruit')){t.planId=t.id;l.recruitPlans.push({id:t.id,start:t.startMonth,review:t.dueMonth,planned:1,filled:0,expected:t.fulfilled,joinDue:t.fulfilled?t.dueMonth:null,path:'legacy-fixed-date',sourceEvent:t.sourceEvent,closed:false});}
 if(['succession','observed'].includes(s.ended)){s.ended=null;s.suspended=true;l.companyStatus='active';l.managementStatus='active';s.ui={phase:'observe',month:s.calendarMonth%3};}
 if(l.exitPlan&&!l.exitPlan.partner)l.exitPlan.partner='事業を引き受ける開発会社';
 if(l.exitPlan?.type==='succession'){const p=s.people.find(p=>p.id===l.exitPlan.personId);l.handover={personId:p?.id,name:p?.name||'旧記録の候補者',family:false,policy:'maintain',start:s.calendarMonth,due:Math.max(s.calendarMonth+1,l.exitPlan.due),sourceEvent:l.exitPlan.sourceEvent,steps:[]};l.exitPlan=null;l.exitReady=false;}
 if(s.calendarMonth>0||s.history.length||s.decisions.length)emit(s,'turning','会社の歴史を、次の世代までつなぐ。','以後は0.8の規則。過去は再計算しない。既存採用計画の入社予定日は維持し、切替時だけ更新する。旧承継で氏名が保存されていない場合は推測で補わない。',{topic:'model'});normalizeLifeOptions(s);return s;}
export function currentLeader(s){return s.life?.generations?.at(-1);}
export function companySnapshot(s){const h=s.history.slice(-4);return {month:s.calendarMonth??0,cash:s.cash,debt:s.debt,revenue:sum(h.map(x=>x.revenue)),profit:sum(h.map(x=>x.profit)),periodMonths:h.length*3,staff:staff(s)+1,people:s.people.filter(p=>p.active).map(p=>p.id),clients:activeClients(s).map(c=>c.id),contracts:s.contracts.filter(c=>c.active).map(c=>c.id),threads:s.threads.map(t=>t.id)};}
function generationOptions(s){const d=s.pending;if(!d)return;
 if(d.type==='large'){
  const b=orderBudget(s,d.value);d.budget=b;d.options=d.options.filter(a=>a.id!=='inhouse');
  d.text=`${d.duration}四半期、毎期${d.value}万円分の追加開発。現在の能力${b.capacity}万円／期、既存の受注見込${b.committed}万円／期、積み残し${b.backlog}万円。追加後の必要量は約${b.required}万円。市況・採用・事故で変わる見積もりです。`;
  if(b.required<=b.capacity)d.options.unshift(choice('inhouse','今の体制で受ける',0,`追加受注 ${d.value}万円／期。追加採用・外注費なし。見積もり上の余力 ${round(b.capacity-b.required)}万円分。`,'今後の受注増・退職・事故で余力が減る可能性。納品と入金は後の決算で確定。'));
 }
 if(d.type==='relationship'){const option=d.options.find(a=>a.id==='companion');if(option){option.desc='調整費20万円。この顧客の基準受注 +15%。会社全体を保守中心にし、その間は新規の大口相談を受けない。';option.effect='会社全体を保守中心へ変更。この方針中は新規の大口案件の相談が発生しない。通常の紹介と既存案件は続く。委任などで別の経営方針になると大口相談の対象に戻る。';}}
 if(d.type==='strategy'){
  const keep=d.options.find(a=>a.id==='maintain');if(keep)keep.desc='追加投資なし。今の取引と体制を維持。次の定期的な見直し相談は12か月後から。会社のことからは随時見直せます。';
  const a=d.options.find(a=>a.id==='focus'),c=focusClient(s);
  if(a&&c){d.focusClientId=c.id;a.title=`${c.name}の新しい受注を終了`;a.desc=`整理費15万円。基準受注 −${c.value}万円／期、維持費 −${c.serviceCost||0}万円／期。既存案件・売掛金・社員は維持。`;a.effect='維持費だけで採算は判断できません。売上の機会も減り、利益が改善する保証はありません。';}
  else if(a)d.options=d.options.filter(a=>a.id!=='focus');
 }

 if(['delegation','team','crisis','finance'].includes(d.type)&&d.entityId&&(!s.people.some(p=>p.id===d.entityId&&p.active)||d.entityId===currentLeader(s)?.personId)){
  d.options=d.options.filter(a=>!['delegate','handsOn','release','relieve','reduce'].includes(a.id));
  if(!d.options.length)d.options=[choice('dismiss','現在の体制を確認して戻る',0,'追加費用なし。時間は進みません。','必要なら、現在の社員を対象に改めて検討します。')];
  d.title='人物の立場が変わったため、相談の条件を更新しました。';d.text='現社長を部下として委任・退職の対象にはできません。現在の在籍と役職に合う操作だけを表示しています。';
 }

 for(const a of d.options){if(['hire','recruit'].includes(a.id)){a.desc='1名の年間計画を開始。活動費35万円。入社時期は2・3・4・6・9・12か月の仮定分布、年末に達成実績を集計。';a.effect='未達31.9%は通常募集だけの年間計画への推計。紹介へ切り替えた計画は別集計。入社前も案件は進む。';}}
 if(d.type==='hiring'){const held=s.life.savedCandidates.find(c=>c.status==='held'&&c.name===d.candidate?.name);if(held){d.candidate={name:held.name,profile:structuredClone(held.profile),contactId:held.id};d.text=`以前に連絡先を残した${held.name}。${held.profile.label}。${held.profile.description}`;}const plan=s.life.recruitPlans.find(p=>!p.closed&&p.filled===0&&s.threads.some(t=>t.planId===p.id&&t.type==='annualRecruit'));const w=d.options.find(a=>a.id==='welcome');if(w){w.cost=35;w.title=`${d.candidate.name}を迎える`;w.desc='準備費35万円、3か月後に入社。';w.effect='入社後は給与が発生し、仕事に慣れる期間が必要。';}if(w&&plan){w.cost=G.referralSwitchCost;w.title=`募集を切り替えて、${d.candidate.name}を迎える`;w.desc=`追加準備10万円。既存募集を止め、同じ計画の1枠で3か月後に入社。支払済み活動費は戻らない。`;w.effect='通常募集の予定入社は取り消し、二重採用しない。12か月の締切後に入社すれば、その年度は未達。';}const wait=d.options.find(a=>a.id==='wait');if(wait){wait.title='回答を保留し、連絡先を残す';wait.desc='現在の募集は継続。「人と取引」から後で再連絡できる。';wait.effect='連絡先を保持する簡略モデル。再連絡で新たな募集費は発生しないが、迎える時は準備費が必要。';}}
}
function candidateDecision(s,id){const d=s.pending,a=d.options.find(a=>a.id===id);if(!a)throw Error('選べません');if(a.cost>s.cash)throw Error('準備資金が不足しています');const joins=s.threads.filter(t=>t.type==='join');if(id==='welcome'&&joins.length)throw Error('予定入社の確認が先です');const e=emit(s,'choice',a.title,a.desc,{topic:'hiring',causes:d.causes});s.decisions.push({id:d.id,q:s.q,month:s.calendarMonth,type:'hiring',choiceId:id,choice:a.title,eventId:e.id,entityId:d.candidate?.contactId??null,before:{load:s.last.load}});charge(s,a.cost,a.title);
 if(id==='wait'){let c=s.life.savedCandidates.find(c=>c.id===d.candidate.contactId);if(!c){c={id:uid(s,'candidate'),...structuredClone(d.candidate),sourceEvent:e.id,status:'held'};s.life.savedCandidates.push(c);}else c.status='held';}
 if(id==='welcome'){const plan=s.life.recruitPlans.find(p=>!p.closed);if(plan){s.threads=s.threads.filter(t=>!(t.planId===plan.id&&t.type==='annualRecruit'));plan.path=plan.filled?'additional-referral':'switched-referral';plan.joinDue=s.calendarMonth+3;plan.switchEvent=e.id;}s.threads.push({id:uid(s,'t'),type:'join',dueMonth:s.calendarMonth+3,...d.candidate,planId:plan?.id??null,sourceEvent:e.id});const c=s.life.savedCandidates.find(c=>c.id===d.candidate.contactId);if(c)c.status='joining';}
 s.pending=s.deferredDecision||null;delete s.deferredDecision;normalizeLifeOptions(s);return s;}
export function contactCandidate(prev,id){const s=structuredClone(prev);if(s.pending||s.ended||s.checkpoint||s.suspended)throw Error('現在の判断・節目を先に確認してください');const c=s.life.savedCandidates.find(c=>c.id===id&&c.status==='held');if(!c)throw Error('連絡できる候補がいません');decision(s,'hiring',`${c.name}に、改めて連絡する。`,`${c.profile.label}。${c.profile.description}`,null,[choice('welcome',`${c.name}を迎える`,35,'準備費35万円、3か月後の入社。','給与と慣れる期間が必要。'),choice('wait','まだ保留する',0,'連絡先を保持。','人数は変わらない。')],[c.sourceEvent]);s.pending.candidate={name:c.name,profile:structuredClone(c.profile),contactId:c.id};normalizeLifeOptions(s);return s;}
// Concurrent loss uses the largest active loss (shared capacity), not a sum.
// This overlap rule is a model assumption, independent of the IPA observations.
function ensureRecoveries(s){const l=s.life;if(l.recoveries)return;
 l.recoveries=[];
 // Preserve the active scalar from 0.8. Historical losses/cash are never replayed.
 if(l.recoveryUntil>0)l.recoveries.push({incidentId:'legacy-recovery',start:s.calendarMonth-1,due:l.recoveryUntil,loss:l.recoveryLoss??1,source:l.recoverySource,tier:'legacy'});
}
function recoverySummary(s){const l=s.life,active=l.recoveries.filter(r=>!r.completed);
 l.recoveryUntil=Math.max(0,...active.map(r=>r.due));l.recoveryLoss=Math.max(0,...active.map(r=>r.loss));
}
function addRecovery(s,incident,months,source){ensureRecoveries(s);if(s.life.recoveries.some(r=>r.incidentId===incident.id))return;
 incident.responseMonth=s.calendarMonth;
 s.life.recoveries.push({incidentId:incident.id,start:s.calendarMonth,due:s.calendarMonth+months,loss:incident.loss??1,source,tier:incident.tier});recoverySummary(s);
}
function advanceRecoveries(s){ensureRecoveries(s);const l=s.life,m=s.calendarMonth,active=l.recoveries.filter(r=>!r.completed);
 l.quarterLostMonths+=Math.max(0,...active.filter(r=>r.start<m&&m<=r.due).map(r=>r.loss));
 for(const r of active.filter(r=>r.due<=m)){r.completed=m;const others=l.recoveries.filter(x=>!x.completed&&x.due>m);emit(s,'turning','事故ごとの復旧が完了した。',`${r.tier==='legacy'?'旧記録から引き継いだ復旧':`${r.start}か月目に対応した事故`}の対応期間が終了。${others.length?`ほかに${others.length}件の復旧が続き、処理能力への影響は${Math.round(Math.max(...others.map(x=>x.loss))*100)}%。`:'進行中の事故対応はなくなった。'}期間中の能力低下は決算に反映される。`,{topic:'cyber',causes:[r.source].filter(Boolean)});}
 recoverySummary(s);
}
function newIncident(s,i,u){const l=s.life;i.tier=harmTier(i.noImpact,u);i.loss=G.capacityLoss[i.tier]||0;const label={none:'影響は確認されなかった',minor:'軽微な対応で収まった',partial:'一部の業務が止まった',total:'全面的に業務が止まった'}[i.tier];const e=emit(s,i.tier==='none'||i.tier==='minor'?'ordinary':'risk',`サイバー事件：${label}。`,`発生と影響なしはIPA群別資料から推計。影響がある場合の軽微45%・一部40%・全面15%は仮定であり、実測の内訳ではない。${i.tier!=='none'?`処理能力への影響は${Math.round(i.loss*100)}%。`:''}`,{topic:'cyber',causes:Object.values(l.preparations||{})});i.eventId=e.id;
 if(i.tier==='none'){i.leak=false;return;}if(i.tier==='minor'){i.leak=false;i.cost=G.minorCost;i.response='routine';i.downtime=1;charge(s,G.minorCost,'軽微なセキュリティ確認');addRecovery(s,i,1,e.id);emit(s,'ordinary','通常の点検で対応を終えた。','確認費3万円、次の1か月の処理能力を5%減。全面停止にはしない。費用と期間は仮定。',{topic:'cyber',causes:[e.id]});return;}
 const partial=i.tier==='partial',opts=[choice('expert','専門家に復旧を依頼',partial?G.partialExpertCost:A.expertCost,`費用${partial?18:45}万円、${partial?'対象業務':'全面'}の停止1か月。残る業務は進む。`,'費用・期間は仮定。情報流出は別に残り得る。'),choice('rebuild','自分たちで再構築',partial?G.partialRebuildCost:10,`費用${partial?6:10}万円、停止範囲は同じで3か月。`,'停止対象の納品が遅れる。')];if(i.backup)opts.unshift(choice('restore','隔離バックアップから復元',partial?G.partialRestoreCost:5,`費用${partial?4:5}万円、停止範囲は同じで1か月。`,'復元で情報流出そのものは消えない。'));lifePending(s,'cyber',`${partial?'一部の業務':'会社全体'}を、どう復旧する？`,`処理能力の${Math.round(i.loss*100)}%が影響を受ける。${i.leak?'情報流出の疑いもあり、顧客に連絡する。':'流出の兆候は今の調査では確認されない。'}被害段階・流出・期間・費用は別の仮定。`,opts,i.id,[e.id]);}
export function registerFamily(prev,name){const s=structuredClone(prev);if(s.pending||s.ended||s.suspended||s.checkpoint)throw Error('判断・中断中は候補を登録できません');name=String(name).trim().slice(0,24);if(!name)throw Error('候補者の名前を入力してください');if(s.life.family.some(p=>p.name===name))throw Error('同名の候補者が登録済みです');const p={id:uid(s,'family'),name,active:true,registered:s.calendarMonth};s.life.family.push(p);emit(s,'turning',`${name}が家族の後継候補として話に加わった。`,'まだ社長ではなく、会社の人数や資金は変わらない。就任には1年間の実務・取引・資金繰りの準備を行う。期間は仮定。',{topic:'succession',entities:[p.id]});return s;}
export function successorCandidates(s){return [...activeTeam(s).filter(p=>p.id!==currentLeader(s)?.personId&&s.calendarMonth-(p.joinedMonth??p.joined*3)>=12).map(p=>({id:p.id,name:p.name,family:false})),...(s.life.family||[]).filter(p=>p.id!==currentLeader(s)?.personId&&p.active).map(p=>({...p,family:true}))];}
export function requestLeadership(prev){const s=structuredClone(prev);if(s.pending||s.ended||s.suspended||s.checkpoint||s.life.handover)throw Error('現在の判断・引継ぎを先に確認してください');lifePending(s,'successor','次の経営者を、誰に託す？','社員は在籍1年以上、家族は候補登録後に準備を開始。候補を選んでも、その場で社長や資金は変わらない。', [...successorCandidates(s).map(p=>choice(p.id,`${p.name}（${p.family?'家族':'社員'}）`,0,p.family?'12か月かけて事業・取引・資金繰りを学ぶ。':'6か月かけて役割と顧客対応を引き継ぐ。','準備期間と成立条件はモデル上の仮定。退職・資金不足・負担があると延期。')),choice('stay','今回は決めない',0,'元の経営へ戻る。','会社は継続。')]);return s;}
function companyExit(s){if(s.pending||s.ended||s.life.exitPlan)throw Error('現在の判断・売却協議を先に確認してください');const opts=[choice('suspend','保存して中断する',0,'会社の状態・判断・予定を保存して停止。いつでも再開。','廃業や結末には数えない。')];if(s.cash+receivables(s)-s.debt-s.life.advanceLiability>=45)opts.push(choice('voluntary','会社を自主廃業する',45,'債権回収と債務精算を行い、事業を閉じる。','黒字でも選べる。再開不可。'));opts.push(choice('sale','第三者への売却を相談する',30,'6か月協議。成立時に独立した会社の物語を終え、引継ぎ先の後日談を表示。','成立50%・価格式は仮定。'),choice('merger','他社との合併を相談する',30,'6か月協議。成立時に新会社へ統合し、その後を短く表示。','成立50%は仮定。合併手続きは簡略化。'),choice('stay','経営を続ける',0,'戻る。','状態は変わらない。'));lifePending(s,'exit','会社の区切りを考える。','社長交代は別の「世代交代」から。保存・中断は会社の終わりではありません。',opts);return s;}
export function requestStrategy(prev){const s=structuredClone(prev);if(s.pending||s.ended||s.checkpoint||s.suspended)throw Error('現在の判断を先に確認してください');openStrategy(s);return s;}
function focusClient(s){return activeClients(s).filter(c=>(c.serviceCost||0)>0).sort((a,b)=>b.serviceCost-a.serviceCost)[0];}
function openStrategy(s){const opts=[];if(!s.life.strategy)opts.push(choice('growth','新しい顧客層向けに事業を育てる',20,'準備20万円、その後6四半期は各18万円を投資。試作・商談の経過を確認する。','需要・会社の余力で成約が変わる。途中で撤退可能。費用と成約モデルは仮定。'));if(activeClients(s).some(c=>(c.serviceCost||0)>0))opts.push(choice('focus','維持費の重い取引を整理する',15,'維持費が最大の顧客の新規受注・維持費を止める。既存案件と売掛金は残す。','売上機会は減る。人数は自動削減しない。利益が改善するかは残る受注と費用次第。'));if(staff(s)>=2&&!s.life.organised)opts.push(choice('organise','役割分担と品質管理を整える',30,'準備30万円、四半期の管理費12万円。6か月後から負担の集中を緩和。','管理費が続く。能力や売上が瞬時に増える施策ではない。'));if(s.life.strategy)opts.push(choice('stopVenture','新事業への追加投資を止める',0,'今後の開発費を止める。支払済み費用は戻らない。','まだ成約前なら、新しい売上は得られない。'));opts.push(choice('maintain','今ある取引と体制を維持する',0,'追加投資なし。今の取引と体制を維持。次の定期的な見直し相談は12か月後から。会社のことからは随時見直せます。','市場や取引先の変化は続く。'));lifePending(s,'strategy','会社の次の形を考える。',`取引${activeClients(s).length}社、直近利益${s.last.profit}万円。経営者が変わっただけでは業績は改善しない。`,opts);normalizeLifeOptions(s);}
function generationDecision(s,id){const d=s.pending,a=d.options.find(a=>a.id===id);if(!a)throw Error('選択できません');if(a.cost>Math.max(0,s.cash))throw Error('資金が不足しています');const e=emit(s,'choice',a.title,a.desc,{topic:d.type,entities:d.entityId?[d.entityId]:[],causes:d.causes});s.decisions.push({id:d.id,q:s.q,month:s.calendarMonth,type:d.type,choiceId:id,choice:a.title,eventId:e.id,entityId:d.entityId,before:{load:s.last.load}});charge(s,a.cost,a.title);s.pending=null;
 if(d.type==='successor'&&id!=='stay'){const p=successorCandidates(s).find(p=>p.id===id);if(!p)throw Error('候補の状態が変わりました');lifePending(s,'handover',`${p.name}と、引継ぎの方針を決める。`,`${p.family?'家族候補として12':'社員として6'}か月かけて準備する。費用${p.family?60:30}万円。会社の資産・社員・案件は維持。`,['growth','maintain','focus'].map(policy=>choice(policy,({growth:'新しい分野を育てる',maintain:'既存の信頼を守る',focus:'規模より採算を整える'})[policy],p.family?60:30,'就任後に具体的な施策を検討。方針だけで業績は変化しない。','準備期間中の退職や負担・資金不足で交代を延期。')),p.id,[e.id]);s.pending.candidate=p;return s;}
 if(d.type==='handover'){const p=d.candidate;s.life.handover={...p,personId:p.id,policy:id,start:s.calendarMonth,due:s.calendarMonth+(p.family?12:6),sourceEvent:e.id,steps:[]};}
 if(d.type==='strategy'){s.life.strategyCooldown=s.calendarMonth+12;const g=currentLeader(s);if(g)g.policy=id;if(id==='growth')s.life.strategy={start:s.calendarMonth,due:s.calendarMonth+G.ventureMonths,spent:20,sourceEvent:e.id,steps:[]};if(id==='stopVenture'){emit(s,'turning','新事業への投資を区切った。',`投資済み${s.life.strategy?.spent||0}万円。経験は残るが、未成立の売上は計上しない。`,{topic:'strategy',causes:[e.id,s.life.strategy?.sourceEvent].filter(Boolean)});s.life.strategy=null;}if(id==='organise'){s.life.organised=true;s.life.organisationDue=s.calendarMonth+6;s.fixed+=G.organisationQuarterCost;}if(id==='focus'){const c=s.clients.find(c=>c.id===d.focusClientId&&c.active);if(c){const lost=c.value,cost=c.serviceCost||0;c.value=0;c.serviceCost=0;c.active=false;emit(s,'turning',`${c.name}の新しい受注を終了した。`,`毎期の基準受注${lost}万円と維持費${cost}万円を減らす。売掛金・既存案件・社員は消さない。売上・利益・人数を別々に確認する。`,{topic:'strategy',entities:[c.id],causes:[e.id]});}}}
 if(d.type==='exit'){if(id==='suspend'){s.suspended=true;s.ui={phase:'observe',summary:true,month:s.calendarMonth%3};}if(id==='voluntary'){s.cash=round(s.cash+receivables(s)-s.debt-s.life.advanceLiability);s.receivables=[];s.debt=0;s.life.advanceLiability=0;finishLife(s,'voluntary',e.id);}if(['sale','merger'].includes(id))s.life.exitPlan={type:id,due:s.calendarMonth+6,sourceEvent:e.id,success:randomChannel(s,'transfer')<A.saleChance,partner:id==='merger'?'地域技術グループ':'事業を引き受ける開発会社'};}
 if(!s.pending&&!s.ended&&s.life.queue.length)s.pending=s.life.queue.shift();normalizeLifeOptions(s);return s;}
function generationMonth(s){const l=s.life,h=l.handover;
 if(h){for(const [offset,label] of [[2,'担当する仕事と資金繰りを確認した'],[4,'顧客と社員への説明を重ねた']])if(s.calendarMonth>=h.start+offset&&!h.steps.includes(offset)){h.steps.push(offset);emit(s,'ordinary',`${h.name}が、${label}。`,'準備の進捗。就任や業績改善が確定したわけではない。',{topic:'succession',entities:[h.personId],causes:[h.sourceEvent]});}}
 const g=currentLeader(s);if(g?.number>1&&s.calendarMonth===g.start+3)emit(s,'turning',`${g.name}のもとで、最初の反応が届いた。`,`${s.last.load>1.1?'社員からは、積み残した仕事を減らしてほしいという声がある。':'社員は役割を確かめながら業務を続けている。'}${concentration(s)>.6?'主要顧客の依存が高く、担当者への説明が課題。':'複数の顧客との約束を引き継いでいる。'}新しい社長への変更自体で売上や利益は増やさない。`,{topic:'succession',causes:[g.sourceEvent]});
}
function generationQuarter(s){const l=s.life,v=l.strategy;if(v&&s.calendarMonth<=v.due){charge(s,G.ventureQuarterCost,'新事業の開発・顧客調査');v.spent+=G.ventureQuarterCost;const elapsed=s.calendarMonth-v.start;if(elapsed>=6&&!v.steps.includes(6)){v.steps.push(6);emit(s,'ordinary','新事業の試作を顧客に見せた。','今は開発費が先行している。売上はまだ計上しない。',{topic:'strategy',causes:[v.sourceEvent]});}}
 if(l.organised&&s.calendarMonth>=l.organisationDue){s.fatigue=clamp(s.fatigue-5,0,100);for(const p of activeTeam(s))p.strain=clamp(p.strain-3,0,100);}
 for(const c of activeClients(s)){if(s.calendarMonth-(c.sinceMonth??c.since*3)>=24&&(s.macro===0||s.last.load>1.2)){c.serviceCost=round((c.serviceCost||0)+6);if(!c.maintenanceWarning){c.maintenanceWarning=true;emit(s,'risk',`${c.name}の保守が、重くなってきた。`,'長く使う仕組みの更新・調整費が増える。市況や仕事量を条件にした仮定モデル。取引の整理か新事業を検討できる。',{topic:'strategy',entities:[c.id],causes:[c.sourceEvent].filter(Boolean)});}}}
}
function generationAfter(s){const l=s.life;
 for(const p of l.recruitPlans.filter(p=>!p.closed&&s.calendarMonth>=p.review)){p.closed=true;const filled=p.joinedMonth<=p.review?p.filled:0;l.recruitHistory.push({planId:p.id,start:p.start,end:p.review,planned:p.planned,filled,path:p.path,joinedMonth:p.joinedMonth??null});emit(s,'turning','年間採用計画を集計した。',`12か月の計画${p.planned}人、期間内入社${filled}人。${p.path==='open-market'?'通常募集の計画。':'途中で紹介へ切り替えた計画は、通常募集の31.9%の検算から分ける。'}入社した月と、この集計月は別。`,{topic:'recruitPlan',causes:[p.sourceEvent,p.switchEvent].filter(Boolean)});}
 const h=l.handover;if(h&&s.calendarMonth>=h.due&&!s.pending&&!l.needsRescue){const person=h.family?l.family.find(p=>p.id===h.personId&&p.active):s.people.find(p=>p.id===h.personId&&p.active);if(!person){emit(s,'risk',`${h.name}への交代準備を中止した。`,'候補が会社を離れたため、その人への承継は成立しない。現経営者と会社の時間は続く。',{topic:'succession',causes:[h.sourceEvent]});l.handover=null;}else if((person.strain||0)>85||s.cash<0){if(!h.warned){h.warned=true;emit(s,'risk',`${h.name}への交代を延期している。`,'本人の負担または資金不足が残る。受注調整・資金対策の後に改めて確認する。',{topic:'succession',causes:[h.sourceEvent]});}}else{const prior=currentLeader(s);prior.end=s.calendarMonth;const previous=s.people.find(p=>p.id===prior.personId);if(previous)previous.role='先代・実務引継ぎ';if(!h.family)person.role='代表兼開発';const snapshot=companySnapshot(s);const e=emit(s,'turning',`${h.name}が、第${l.generations.length+1}代の経営者になった。`,`先代${prior.name}から資金${snapshot.cash}万円・借入${snapshot.debt}万円・${snapshot.staff}人体制・取引${snapshot.clients.length}社を引き継ぐ。案件・入金・採用予定も継続。先代は当面実務の引継ぎを続け、交代だけで人数・給与・能力を増減しない。`,{topic:'succession',entities:[h.personId],causes:[h.sourceEvent]});l.generations.push({number:l.generations.length+1,name:h.name,personId:h.personId,family:h.family,start:s.calendarMonth,policy:h.policy,baseline:snapshot,reviews:[],sourceEvent:e.id});l.handover=null;l.companyStatus='active';l.managementStatus='active';l.strategyCooldown=0;l.postHandover=true;}}
 const g=currentLeader(s);if(g&&g.number>1&&s.calendarMonth-g.start>=12&&(s.calendarMonth-g.start)%12===0&&!g.reviews.some(r=>r.month===s.calendarMonth)){const snap=companySnapshot(s);g.reviews.push(snap);emit(s,'turning',`${g.name}の時代を、${(s.calendarMonth-g.start)/12}年見届けた。`,`直近${snap.periodMonths}か月：売上${snap.revenue}万円／利益${snap.profit}万円／${snap.staff}人。承継時の直近${g.baseline.periodMonths}か月：${g.baseline.revenue}万円／${g.baseline.profit}万円／${g.baseline.staff}人。規模と利益は別に変わる。`,{topic:'generationReview',causes:[g.sourceEvent]});}
 const v=l.strategy;if(v&&s.calendarMonth>=v.due){const chance=clamp(G.ventureAdoption+(s.macro===2?.1:s.macro===0?-.1:0)-(s.last.load>1.3?.15:0),.1,.8);if(randomChannel(s,'venture')<chance){const c=client(s,`新事業の顧客${s.serial}`,60,{sourceEvent:v.sourceEvent});emit(s,'turning','新しい分野で、最初の継続契約ができた。',`投資${v.spent}万円を経て、基準受注60万円/期。納品能力と費用の制約は今後も残る。成約モデルは仮定。`,{topic:'strategy',entities:[c.id],causes:[v.sourceEvent]});}else emit(s,'risk','新事業の試行は、継続契約に届かなかった。',`${v.spent}万円を投じたが、需要や社内の余力が合わなかった。費用と経験が残る。`,{topic:'strategy',causes:[v.sourceEvent]});l.strategy=null;}
 if(l.exitPlan&&s.calendarMonth>=l.exitPlan.due&&!s.pending&&!l.needsRescue){const p=l.exitPlan;l.exitPlan=null;l.exitReady=false;if(p.success){if(p.type==='sale')l.ownerProceeds=round(Math.max(0,s.cash+receivables(s)-s.debt-l.advanceLiability)+Math.max(0,s.last.profit)*4);const reason=p.type==='merger'?'merged':'sold';finishLife(s,reason,p.sourceEvent);l.companyStatus='integrated';const issues=s.backlog>0?'積み残した仕事の整理が、引継ぎ先の最初の課題になった。':'既存顧客との仕事を引継ぎ先へ渡した。';l.epilogue={partner:p.partner,at:s.calendarMonth,text:`半年後の後日談（詳細な再計算ではなく、引継ぎ状態から描く仮定）：${p.partner}へ、${activeClients(s).length}社の取引と${s.contracts.filter(k=>k.active).length}件の進行案件を引き継いだ。${issues}引継ぎ先は顧客窓口を一本化し、残る案件と保守の担当を整えている。独立後の売上や成長を保証する統計ではない。`};emit(s,'ending',reason==='merged'?'会社は新しい組織へ統合された。':'独立した会社としての物語を終えた。',l.epilogue.text,{topic:'epilogue',causes:[p.sourceEvent]});}else emit(s,'turning','統合・売却の協議は成立しなかった。','会社は独立したまま続く。支払済み費用は戻らない。',{topic:'succession',causes:[p.sourceEvent]});}
}
function generationPrompt(s){const l=s.life;if(s.calendarMonth<(l.strategyCooldown||0))return false;const costsHeavy=activeClients(s).some(c=>(c.serviceCost||0)>c.value*.3),declining=s.history.length>=4&&s.history.slice(-3).every(h=>h.profit<0),organisation=staff(s)>=3&&s.fatigue>55&&!l.organised;if(l.postHandover||costsHeavy||declining||organisation){l.postHandover=false;l.strategyCooldown=s.calendarMonth+12;openStrategy(s);return true;}return false;}

// 0.9: state-derived offers. Baseline workload is an estimate, never a promise.
export function orderBudget(s,additional=0){
 const q=s.q+1,running=s.contracts.filter(k=>k.active&&k.start<=q&&k.end>=q),external=running.filter(k=>k.outsource).length;
 const recovery=s.life?.recoveryLoss||0,capacity=round(((s.config.parameters.capacityPerPerson+sum(activeTeam(s).map(p=>personCapacity(s,p))))*s.skill*(1-s.fatigue/600)+external*180)*(1-recovery));
 const factor=s.workPlan?.until>=q?s.workPlan.factor:1;
 const committed=round((sum(activeClients(s).map(c=>c.value))*[.79,1,1.16][s.macro]+sum(running.map(k=>k.value)))*factor);
 return {capacity,committed,backlog:s.backlog,required:round(committed+s.backlog+additional)};
}
export function availableDecisionOptions(state){const s=structuredClone(state);normalizeLifeOptions(s);const d=s.pending;if(!d)return [];
 return d.options.filter(a=>{
  if(a.cost>Math.max(0,s.cash)&&d.type!=='cyber')return false;
  if(d.initiated&&(s.actionLocks||[]).includes(`${d.type}:${a.id}`))return false;
  if(['hire','welcome','recruit'].includes(a.id)&&s.threads.some(t=>(s.life?.version>=2&&a.id==='welcome'?['join']:['join','recruit','annualRecruit']).includes(t.type)))return false;
  if(s.life?.version>=2&&['hire','recruit'].includes(a.id)&&s.life.recruitPlans.some(p=>!p.closed))return false;
  return true;
 });
}
export function autoCanChoose(s,mode){return mode!=='manual'&&!!s?.pending&&!s.ended&&!s.suspended&&(mode==='all'||!['exit','rescue','crisis','finance'].includes(s.pending.type))&&availableDecisionOptions(s).length>0;}
function drawAutoChoice(prev,mode){
 if(!autoCanChoose(prev,mode))throw Error('この判断は手動確認が必要です');const s=structuredClone(prev);normalizeLifeOptions(s);
 const options=availableDecisionOptions(s).filter(a=>!['suspend','observe'].includes(a.id));if(!options.length)throw Error('自動選択できる対応がありません');
 // Separate stream: observing vs intervening does not consume the world RNG.
 s.autoRng??=(s.seed^0x915AC27)>>>0;const stream={rng:s.autoRng},chosen=options[Math.floor(rng(stream)*options.length)];s.autoRng=stream.rng;
 return {s,chosen};
}
export function previewAutoChoice(prev,mode='safe'){return {...drawAutoChoice(prev,mode).chosen};}
export function autoDecision(prev,mode='safe'){
 const {s,chosen}=drawAutoChoice(prev,mode);
 const n=registerDecision(s,chosen.id);const e=n.events.filter(e=>e.kind==='choice').at(-1);if(e&&e.id!==prev.events.filter(e=>e.kind==='choice').at(-1)?.id){e.auto=true;e.text='おまかせで選択。'+e.text;}
 n.autoLast={month:n.calendarMonth,title:chosen.title,cost:chosen.cost,text:chosen.desc};return n;
}
