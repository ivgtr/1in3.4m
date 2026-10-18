import React from 'react';
import styles from './Evidence.module.css';
import shared from './shared.module.css';
import { REAL_START, REAL_MOMENTS, teamBucket } from '../domain/insights.js';
import { num } from '../game/format.js';
import { Bars } from './EvidenceChart.jsx';
import { EvidenceCard } from './EvidenceCard.jsx';
import { StartInsight } from './StartInsight.jsx';
import { SuccessionEvidence } from './SuccessionEvidence.jsx';

function Moment({ kind }) {
  const data = REAL_MOMENTS[kind];
  return <section className={styles['evidence-card']}>
    <span className={shared['source-tag']}>実調査 · 2025年度</span>
    <h3>{data.title}</h3>
    <Bars labels={data.labels} values={data.values} />
    <p>{data.finding}</p>
    <details>
      <summary>対象・調査時点・出典・限界</summary>
      <p>{REAL_START.population}</p>
      <p>2025年8月調査。回答企業の開業後経過月数は平均15.5か月。本項目の回答数は{num(data.n)}社です。</p>
      <p>{data.limit}</p>
      <p>この会社と同じ年数・業種に限定した比較ではなく、全企業の分布やゲーム内集計でもありません。</p>
      <a href={`${REAL_START.url}#page=${data.page + 1}`} target="_blank" rel="noreferrer">日本政策金融公庫「2025年度新規開業実態調査」p.{data.page} 図{data.figure} ↗</a>
    </details>
  </section>;
}

export function Discovery({ kind, state }) {
  let line;
  let detail;
  if (REAL_MOMENTS[kind]) {
    const data = REAL_MOMENTS[kind];
    line = kind === 'growth'
      ? '公庫融資先の新規開業企業では、売上が横ばい・減少傾向の回答が39.9%。成長の道筋は一様ではありません。'
      : `公庫融資先の新規開業企業の${data.values[0]}%が「${data.labels[0]}」と回答しています。`;
    detail = <Moment kind={kind} />;
  } else if (kind === 'start') {
    const count = state.initial.staff + 1;
    const bucket = teamBucket(count);
    line = `公庫融資先の新規開業企業では、${REAL_START.labels[bucket]}での開業が${REAL_START.values[bucket]}%。今回の会社は${count}人から。`;
    detail = <StartInsight state={state} />;
  } else if (kind === 'cyber') {
    line = 'IPA調査の小規模企業では、年間のインシデント経験は自己診断70点以上群12.2%、69点以下群17.1%。対策があっても、経験ゼロとは限りません。';
    detail = <EvidenceCard kind="cyber" title="発生したことと、影響が残ったことは別。"><p>発生経験企業の「影響なし」は32.2% / 23.0%。群間差は対策購入の因果効果ではありません。月率への換算は推計、被害段階・費用・復旧期間は仮定です。</p></EvidenceCard>;
  } else if (kind === 'annualHiring') {
    line = '公庫取引先・49人以下の採用実施企業では、年間計画未達が31.9%。候補者1人の失敗率ではありません。';
    detail = <EvidenceCard kind="hiring" title="採用は、1年間の計画として振り返る。"><p>1名の計画への適用は推計です。通常募集の入社時期は2・3・4・6・9・12か月から選ぶ別の仮定。入社した月と年間集計の月は別で、紹介への切替・追加採用も分けて集計します。</p></EvidenceCard>;
  } else if (kind === 'succession') {
    line = '承継した兵庫県の信用保証協会利用企業610社では、当期利益が承継時から減少した回答は17.2%。交代は成長の保証ではありません。';
    detail = <SuccessionEvidence />;
  } else if (kind === 'departures') {
    line = '公庫取引先・従業者49人以下の回答2,338社では、2025年度の退職者が0人だった企業は45.4%。';
    detail = <EvidenceCard kind="departures" title="人数の変化にも、それぞれの経過がある。"><p>企業ごとの年間退職者数です。数人の会社と規模が一致しないため、社員個人の退職確率に換算しません。</p></EvidenceCard>;
  } else {
    return null;
  }
  return <aside className={styles['discovery']}>
    <span className={shared['source-tag']}>実調査 · この出来事から</span>
    <p>{line}</p>
    <details>
      <summary>対象・調査年・出典を読む</summary>
      {detail}
      <p className={`${shared['note']} ${styles['note']}`}>自社の成功確率や順位を示す数字ではありません。</p>
    </details>
  </aside>;
}
