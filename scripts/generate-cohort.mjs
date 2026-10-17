import fs from 'node:fs';
import {loadBucket} from '../dist/insights.js';
import {create,advance,resolve,MODEL,activeClients,staff,problems,requestHelp,experiencePatterns} from '../dist/model.js';
const config=JSON.parse(fs.readFileSync(new URL('../dist/model-data.json',import.meta.url)));
const output={model:MODEL,dataVersion:config.version,classification:'デモ内の生成集計',method:'各境遇240社。困りごとを確認する各回に50%で自主対処を開き、選択可能な案から一様に抽選。初期条件・会社の乱数と方針選択の乱数は別。創業から20四半期または資金不足まで。現実の確率ではない。',seedBase:172026,groups:{}};
for(let j=0;j<config.origins.length;j++){
 const origin=config.origins[j],cash=[],g={count:240,initialTeam:origin.team.length+1,survived:0,insolvent:0,longRelations:0,changedTeam:0,referralCompanies:0,decisionCompanies:{},patterns:{},quarters:{},averageDecisions:0,averageMonthsPerObserve:0},qPerClick=[];
 for(let i=0;i<g.count;i++){
 let s=create(172026+j*10000+i,'集計用の会社',config,origin.id),policy=(i+71+j*1000)>>>0,clicks=0;cash.push(s.cash);
 while(!s.ended&&clicks++<90){policy=(Math.imul(policy,1664525)+1013904223)>>>0;const issues=problems(s);if(issues.length&&!s.pending?.initiated&&policy/4294967296<.5)s=requestHelp(s,issues[0].id);if(s.pending){policy=(Math.imul(policy,1664525)+1013904223)>>>0;const option=s.pending.options[Math.floor(policy/4294967296*s.pending.options.length)];s=resolve(s,option.id);}else{const before=s.q;s=advance(s);qPerClick.push((s.q-before)*3);}}
 if(!s.ended)throw Error('進行が終了しない');
 g.survived+=Number(s.ended==='five-years');g.insolvent+=Number(s.ended==='insolvent');g.longRelations+=Number(activeClients(s).some(c=>s.q-c.since>=8));g.changedTeam+=Number(s.people.some(p=>p.founding&&!p.active));g.referralCompanies+=Number(s.events.some(e=>e.topic==='referral'&&e.causes.length));g.averageDecisions+=s.decisions.length;
 for(const h of s.history){if(h.cash<0)continue;const q=g.quarters[h.q]||={count:0,load:[0,0,0,0]};q.count++;q.load[loadBucket(h.load)]++;}
 for(const record of experiencePatterns(s)){const group=g.patterns[record.key]||={eligible:0,continued:0};group.eligible++;group.continued+=Number(record.continued);}
 for(const type of new Set(s.decisions.map(d=>d.type)))g.decisionCompanies[type]=(g.decisionCompanies[type]||0)+1;
 }
 cash.sort((a,b)=>a-b);g.initialCashMedian=Math.round((cash[119]+cash[120])/2);g.initialCashRange=[Math.round(cash[0]),Math.round(cash.at(-1))];g.averageDecisions=Math.round(g.averageDecisions/g.count*10)/10;g.averageMonthsPerObserve=Math.round(qPerClick.reduce((a,b)=>a+b,0)/qPerClick.length*10)/10;output.groups[origin.id]=g;
}
fs.writeFileSync(new URL('../dist/cohort.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log('Generated 720 companies, matched trajectories and quarterly workload distributions.');
