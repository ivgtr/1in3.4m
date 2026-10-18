import {momentAssignments} from './insights.js';
const month=e=>e.month??e.q*3;
// Only stored entities and earlier records are used. No narrative RNG or inferred motive.
export function eventDigest(state,event){
 const related=[...(state.people||[]),...(state.clients||[]),...(state.contacts||[])].filter(p=>(event.entities||[]).includes(p.id));
 const names=[...new Set(related.map(p=>p.name))];
 const {title,scale}=eventSummary(state,event);
 const participants=names.filter(name=>!title.includes(name));
 const index=state.events.findIndex(e=>e.id===event.id),earlier=state.events.slice(0,Math.max(0,index));
 const previous=earlier.filter(e=>month(e)<=month(event)&&((event.causes||[]).includes(e.id)||(e.entities||[]).some(id=>(event.entities||[]).includes(id)))).at(-1);
 const founders=related.filter(p=>p.founding).map(p=>p.name);
 return {title,scale,participants,previous,founders,significant:['turning','risk','ending'].includes(event.kind)};
}
// Read immutable event wording and the contract linked to that exact decision.
// Entity membership describes involvement, never proof of who acted.
export function eventSummary(state,event){
 let title=event.title,scale='';const text=event.text||'',decision=(state.decisions||[]).find(d=>d.eventId===event.id);
 const period=q=>q%4===0?`${q/4}年間`:`${q*3}か月間`;
 if(event.topic==='client'&&title.endsWith('との試作は、ひとまずここまで。')&&text.includes('継続契約に至らなかった'))title=title.replace('との試作は、ひとまずここまで。','との試作期間が終了。継続契約には至らなかった。');
 if(event.topic==='client'&&title.endsWith('が、「次もお願いしたい」と言ってくれた。')&&text.includes('継続取引へつながった')){title=title.replace('が、「次もお願いしたい」と言ってくれた。','との試作から、継続契約が成立した。');const amount=text.match(/毎期約([\d.]+)万円/);if(amount)scale=`基準受注 約${amount[1]}万円／期`;}
 if(['finance','crisis'].includes(event.topic)&&event.kind==='choice'&&(decision?.choiceId==='borrow'||/300万円(?:を)?借りる/.test(title)))title='会社が運転資金300万円を借りた。';
 if(event.topic==='finance'&&title==='会社を続けるための、時間を借りた。'&&text.startsWith('300万円が入金された。'))title='会社に借入金300万円が入金された。';
 if(event.topic==='contract'){
 const size=text.match(/^毎期([\d.]+)万円分、(\d+)四半期の仕事/);
 if(size)scale=`大口受注 · ${size[1]}万円／期 · ${period(Number(size[2]))}`;
 const ended=text.match(/^(\d+)四半期の追加受注が終わった/);
 if(ended){title=title.replace('の大口受注期間が、一区切り。','の大口受注期間が終了した。');scale=`${period(Number(ended[1]))}の契約終了`;}
 }
 if(decision?.type==='inquiry'&&decision.choiceId==='trial'){
 const k=(state.contracts||[]).find(k=>k.kind==='trial'&&k.sourceEvent===event.id),client=(state.clients||[]).find(c=>c.id===k?.clientId);
 if(k&&client){title=`${client.name}の試作を受注した。`;scale=`${k.value}万円／期 · ${period(k.end-k.start+1)}`;}
 }
 if(decision?.type==='inquiry'){
 const lead=(state.contacts||[]).find(c=>c.id===decision.entityId);
 const source=[...(state.clients||[]),...(state.contacts||[])].find(c=>c.id===lead?.sourceId);
 if(lead&&decision.choiceId==='negotiate')title=`${source?source.name+'の紹介で、':''}${lead.name}に継続契約を提案した。${text.includes('1か月後')?'回答は翌月。':''}`;
 if(lead&&source&&decision.choiceId==='trial'&&!title.includes(source.name))title=`${source.name}の紹介で、${title}`;
 }
 return {title,scale};
}
export function discoveryAssignments(state){
 const map=momentAssignments(state),used=new Set(map.values());
 for(const e of state.events){let key;
 if(e.kind==='start')key='start';
 if(e.topic==='cyber'&&state.life?.incidents.some(i=>i.eventId===e.id))key='cyber';
 if(e.topic==='recruitPlan')key='annualHiring';
 if(e.topic==='generationReview')key='succession';
 if(key==='succession'){const group=`succession:${e.causes?.[0]||'unknown'}`;if(!used.has(group)){used.add(group);map.set(e.id,key);}continue;}
 if(key&&!used.has(key)){used.add(key);map.set(e.id,key);}
 }
 return map;
}

// Stable month groups: never invent quiet-month events or reorder within a month.
export function diaryMonths(records){const groups=[];for(const record of records){let group=groups.at(-1);if(!group||group.month!==record.month){group={month:record.month,records:[]};groups.push(group);}group.records.push(record);}return groups;}
