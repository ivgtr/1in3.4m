// Published cohort observations and explicit transformations, never causal treatment claims.
export const EVIDENCE={
 cyber:{kind:'実測',source:'IPA 2024年度 中小企業における情報セキュリティ対策に関する実態調査',url:'https://www.ipa.go.jp/security/reports/sme/nl10bi000000fbvc-att/sme-chousa-report2024r1.pdf',page:'212–213 図5-9・5-10',observed:'2023年度の発生経験（発生した可能性が高い場合を含む）。2024年10月25日〜11月6日Web調査',population:'小規模企業者2,775社。診断70点以上485社、69点以下2,290社。業種混合の登録モニターで、受託開発会社だけではない',high:{annual:.122,noImpact:.322,n:485,incidentN:59},low:{annual:.171,noImpact:.230,n:2290,incidentN:391},limit:'影響なしは発生経験企業に条件付けた割合。モデルでは会社の1年間の経験を最大1つの事件経過に集約し、同一年の複数事故は再現しない。発生・影響は自己申告。群間差は対策購入の因果効果ではない。'},
 hiring:{kind:'実測',source:'日本政策金融公庫 中小企業における従業員の採用・定着に関する調査',url:'https://www.jfc.go.jp/n/findings/pdf/tokubetu_260619.pdf',page:'3 図5',observed:'2025年4月〜2026年3月の中途正社員採用活動、2026年3月調査',population:'公庫中小企業事業取引先。49人以下で中途採用活動を実施し、予定数と実数を回答した1,290社',underPlan:.319,limit:'候補者1人の失敗率でも3か月の失敗率でもない。1名計画の小さな開発会社への移植は推計。'},
 departures:{kind:'実測・参考のみ',source:'同上',url:'https://www.jfc.go.jp/n/findings/pdf/tokubetu_260619.pdf',page:'6 図10',observed:'2025年度の退職者数',population:'49人以下、回答2,338社',zero:.454,limit:'社員個人の離職率ではなく、企業の年間退職者数。数人の会社と規模が一致しないため、個人の退職抽選には使わない。'},
 closure:{kind:'実測・参考のみ',source:'帝国データバンク 全国企業「休廃業・解散」動向調査（2025年）',url:'https://www.tdb.co.jp/report/industry/20260109-kyuhaigyo25y/',page:'直近損益',observed:'2025年休廃業・解散企業',population:'TDB等の企業データベース。法的整理を除く休廃業・解散、個人事業主を含む',profitable:.491,limit:'休廃業企業の内訳であり、黒字企業の廃業確率ではない。終了の抽選に使わない。'},
 survival:{kind:'実測・参考のみ',source:'公庫 新規開業パネル調査 2021年12月公表',url:'https://www.jfc.go.jp/n/findings/pdf/panel_211221.pdf',page:'1・3 表1',observed:'2016年末を基準に2020年末まで',population:'公庫融資先で2016年開業を確認した初回回答3,517社。不動産賃貸業を除く',active:.897,closed:.089,unknown:.014,limit:'基準時点から4年間。開業直後からの5年生存率ではない。対象・時代・業種構成が異なるため、本ゲーム全体を一致させる目標にしない。'}
};
export const ASSUMPTIONS={backupCost:20,backupMonthly:1,insuranceMonthly:2,insuranceShare:.8,insuranceExcess:10,programmeCost:45,programmeMonths:3,restoreMonths:1,rebuildMonths:3,expertCost:45,depositShare:.3,factorFee:.05,rescueLimit:300,transferMonths:6,successionChance:.65,saleChance:.5,leakShare:.25};
export const monthlyHazard=annual=>1-Math.pow(1-annual,1/12);
export function randomChannel(s,key){s.life.streams||={};let n=s.life.streams[key]??((s.seed^Array.from(key).reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,0))>>>0);n=(n+0x6D2B79F5)>>>0;s.life.streams[key]=n;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
export function cyberTrial(group,u,v){const r=EVIDENCE.cyber[group];return {annual:r.annual,monthly:monthlyHazard(r.annual),incident:u<monthlyHazard(r.annual),noImpact:v<r.noImpact};}
export function annualRecruitOutcome(u){return u>=EVIDENCE.hiring.underPlan;}

export const GENERATION_ASSUMPTIONS={
 hiringMonths:[2,3,4,6,9,12],hiringTiming:'達成する計画の入社月は6候補から均等。実測の採用期間ではない',
 harmShares:{minor:.45,partial:.40,total:.15},capacityLoss:{minor:.05,partial:.35,total:1},
 minorCost:3,partialExpertCost:18,partialRebuildCost:6,partialRestoreCost:4,
 referralSwitchCost:10,employeePreparationMonths:6,familyPreparationMonths:12,
 ventureQuarterCost:18,ventureMonths:18,ventureAdoption:.45,organisationQuarterCost:12,
 comparison:'承継後の成長確率・利益増加ボーナスは置かない。以下の経営施策の費用・期間・状態効果は仮定'
};
export function hiringMonth(u){return GENERATION_ASSUMPTIONS.hiringMonths[Math.min(5,Math.floor(u*6))];}
export function harmTier(noImpact,u){return noImpact?'none':u<.45?'minor':u<.85?'partial':'total';}
export const SUCCESSION_EVIDENCE={
 profit:{kind:'実測・参考のみ',source:'RIETI掲載・家森信善の調査',url:'https://www.rieti.go.jp/jp/columns/s21_0005.html',page:'表1・注4',observed:'2019年2月調査。2011年7月〜2018年11月に承継',population:'兵庫県信用保証協会利用企業。利益比較回答610社',values:[40.5,42.3,17.2],labels:['当期利益が増加','横ばい','減少'],limit:'承継時との比較。経過期間は一定でなく、売上や毎年の成長確率ではない。全国・小規模開発会社の代表ではない。'},
 innovation:{kind:'実測・参考のみ',source:'公庫論集 第8号（2010年8月）',url:'https://www.jfc.go.jp/n/findings/pdf/ronbun1008_01.pdf',page:'p.2 表1 / p.6 図6',observed:'2009年7月。承継前と最近の業績を自己評価。固定追跡期間なし',population:'公庫融資先調査9,397回答から、2代目以降・従業者19人以下。取組企業2,064社／非取組251社',improved:[43.8,17.5],limit:'経営革新あり・なしの改善割合。売上・利益の実額とは異なる自己評価。選択効果の因果推定には使わない。'},
 sales:{kind:'実測・定性的参考のみ',source:'2023年版中小企業白書',url:'https://www.chusho.meti.go.jp/pamflet/hakusyo/2023/PDF/chusho/04Hakusyo_part2_chap2_web.pdf',page:'第2-2-12・13図',observed:'2008〜2012年に1回交代、以後9年間の売上が観測可能',population:'TDB企業概要ファイル。図の分母件数は確認できていないため数値比較には使用しない',limit:'業種平均との差・成長率分布。継続観測可能企業への選択と外れ値除外あり。後続の3,551回答のアンケートとは別。成長確率に転用しない。'}
};
