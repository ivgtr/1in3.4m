// Explicit low-impact replies only. Zero initial cost alone does not make a decision light.
export function isLightChoice(decision,option){return !!option&&option.cost===0&&({inquiry:['pass'],hiring:['wait'],successor:['stay'],strategy:['maintain']})[decision?.type]?.includes(option.id)===true;}
export function changedPlaces(before,after){
 return {month:after.calendarMonth,cash:after.cash-before.cash,debt:after.debt-before.debt,
 people:(after.people||[]).filter(p=>p.active&&!before.people.some(q=>q.id===p.id&&q.active)).map(p=>p.id),
 work:(after.contracts||[]).filter(k=>k.active&&!before.contracts.some(q=>q.id===k.id&&q.active)).map(k=>k.id),
 done:(after.contracts||[]).filter(k=>!k.active&&before.contracts.some(q=>q.id===k.id&&q.active)).map(k=>({id:k.id,clientId:k.clientId,kind:k.kind}))};
}
// Visible outcomes come from committed state changes, not the option's promises.
export function decisionOutcomes(before,after){
 const lines=[],fmt=n=>Number(n.toFixed(2)).toLocaleString('ja-JP');
 for(const p of after.people||[]){const old=before.people?.find(x=>x.id===p.id);if(!old||!p.active)continue;
 if(p.strain<old.strain)lines.push(`${p.name}の負担が軽くなった（${fmt(old.strain)} → ${fmt(p.strain)} / 100）。`);
 if(p.strain>old.strain)lines.push(`${p.name}の負担が増えた（${fmt(old.strain)} → ${fmt(p.strain)} / 100）。`);
 if(p.role!==old.role)lines.push(`${p.name}が「${p.role}」を担うことになった。`);
 }
 for(const c of after.clients||[]){const old=before.clients?.find(x=>x.id===c.id);if(!old||c.value===old.value)continue;
 lines.push(`${c.name}の${before.pending?.type==='relationship'&&after.style==='companion'?'保守の':''}基準受注が${c.value>old.value?'増えた':'減った'}（${fmt(old.value)} → ${fmt(c.value)}万円／期）。売上・入金は今後の納品で決まる。`);
 }
 if(after.workPlan&&JSON.stringify(after.workPlan)!==JSON.stringify(before.workPlan))lines.push(`受注量を通常の${Math.round(after.workPlan.factor*100)}%に調整した。残っている仕事は引き続き納める。`);
 if(before.style!=='companion'&&after.style==='companion')lines.push('会社全体を保守中心の方針へ変更。この方針中、新規の大口案件の相談は発生しない。通常の紹介や既存案件は続く。');
 return lines;
}
export function personCondition(person){
 if(!Number.isFinite(person.strain))return {text:'負担の記録はまだありません',level:'unknown'};
 if(person.strain>=70)return {text:'負担が強く、働き方の見直しが必要',level:'high'};
 if(person.strain>=40)return {text:'最近、仕事の負担が重くなっている',level:'watch'};
 if(person.overloadPeriods>0&&person.strain>=20)return {text:'忙しい時期の負担が残っている',level:'watch'};
 return {text:'今は仕事の負担が落ち着いている',level:'calm'};
}
