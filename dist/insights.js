// Published observations, separate from the simulation's assumptions.
export const REAL_START={year:2025,title:'2025年度 新規開業実態調査',publisher:'日本政策金融公庫 総合研究所',url:'https://www.jfc.go.jp/n/findings/pdf/kaigyo_251205_1.pdf',page:1,n:1994,observed:'2025年8月',population:'2024年4〜9月に公庫国民生活事業が融資した、融資時点で開業後1年以内の企業（不動産賃貸業を除く）。個人企業・法人企業を含む。',labels:['1人','2人','3人','4人','5〜9人','10人以上'],values:[42.6,22.5,11.6,7.2,12.9,3.2],notes:'経営者本人を含む。全企業や受託開発業の代表値ではない。人数だけを照合し、資金や成功確率は比較しない。'};
export const LOAD_LABELS=['80%未満','80〜110%','110%超〜150%','150%超'];
export const loadBucket=n=>n<.8?0:n<=1.1?1:n<=1.5?2:3;
export const teamBucket=n=>n<=4?n-1:n<=9?4:5;
export function continuation(state,advance){const next=advance(state);return {next,months:(next.q-state.q)*3,consultation:next.q===state.q&&!!next.pending};}
// JFC 2025, printed pp.12–13 (PDF pages 13–14), figures 21 and 24.
// Self-reported conditions among recent JFC-financed startups, not game odds.
export const REAL_MOMENTS={
 hiring:{title:'人を探す難しさは、開業後にも続く',labels:['従業員の確保に苦労'],values:[26.6],n:2078,page:13,figure:24,finding:'回答企業の約4社に1社が、人の確保を現在の課題に挙げています。',limit:'3つまでの複数回答。採用に失敗した企業の割合や、今回の採用成功確率ではありません。'},
 training:{title:'迎えたあとには、育てる課題がある',labels:['従業員教育・人材育成に苦労'],values:[19.1],n:2078,page:13,figure:24,finding:'採用できることと、一緒に仕事を回せることは別。約5社に1社が教育・育成を課題に挙げています。',limit:'3つまでの複数回答。採用直後の企業だけを調べた数字ではありません。'},
 growth:{title:'開業後の売上は、みな同じ方向には進まない',labels:['増加傾向','横ばい','減少傾向'],values:[60.1,34.0,5.9],n:2107,page:12,figure:21,finding:'増加が約6割を占める一方、横ばい・減少も約4割あります。',limit:'経営者が回答した売上の傾向。ゲームの前期比や5年間の成長率とは測り方が異なります。順位は付けません。'}
};
export function momentAssignments(state){
 const assignments=new Map(),used=new Set();
 for(const e of state.events){const d=state.decisions.find(d=>d.eventId===e.id);let key;
 if(d&&['recruit','hire','welcome'].includes(d.choiceId))key='hiring';
 if(e.topic==='people'&&e.kind==='turning'&&state.people.some(p=>p.joinEvent===e.id))key='training';
 if(key&&!used.has(key)){used.add(key);assignments.set(e.id,key);}
 }
 return assignments;
}
