// The same dated commitments feed the current company and decision receipts.
export function schedules(s){
 const rows=[];const add=(key,label,month)=>{if(Number.isFinite(month))rows.push({key,label,month});};
 for(const k of s.contracts.filter(k=>k.active))add(`contract:${k.id}`,`${s.clients.find(c=>c.id===k.clientId)?.name||'取引先'}の${k.kind==='trial'?'試作':'開発契約'}（${Math.round(k.value)}万円／期）終了予定`,k.end*3);
 for(const t of s.threads){const label={join:`${t.name||'候補者'}の入社予定`,recruit:`${t.name||'候補者'}の採用結果`,annualRecruit:'採用活動の結果（採用未確定）',negotiation:'契約交渉の回答',improve:'役割の引継ぎ',workReview:'受注調整の経過確認',maintenance:'保守契約への移行'}[t.type];if(label)add(`thread:${t.id}`,label,t.dueMonth??t.due*3);}
 const l=s.life;if(l){
 for(const r of l.recoveries||[])if(!r.completed)add(`recovery:${r.incidentId}`,`事故の業務復旧（能力への影響${Math.round(r.loss*100)}%）`,r.due);
 if(!l.recoveries&&l.recoveryUntil)add('legacy-recovery','業務復旧',l.recoveryUntil);
 for(const [key,label] of [['handover',`${l.handover?.name||'後継者'}への交代準備`],['strategy','新事業の経過確認'],['exitPlan','売却・合併等の協議結果']])if(l[key])add(key,label,l[key].due);
 for(const [key,label] of [['claimDue','保険補填の入金'],['programmeDue','情報管理の整備完了']])if(l[key])add(key,label,l[key]);
 for(const p of l.recruitPlans||[])if(!p.closed)add(`plan:${p.id}`,'採用計画の年間集計',p.review);
 }
 return rows;
}
export function changedSchedules(before,after){const old=new Map(schedules(before).map(r=>[r.key,r]));return schedules(after).filter(r=>JSON.stringify(old.get(r.key))!==JSON.stringify(r));}
