import React from 'react';
import styles from './Evidence.module.css';
import shared from './shared.module.css';
import { SUCCESSION_EVIDENCE } from '../domain/evidence.js';
import { Bars } from './EvidenceChart.jsx';
import { SourceDetails } from './EvidenceCard.jsx';

export function SuccessionEvidence() {
  const profit = SUCCESSION_EVIDENCE.profit;
  return <section className={styles['evidence-card']}>
    <span className={shared['source-tag']}>実測・参考のみ · 承継の抽選には使用しない</span>
    <h3>交代した会社にも、違う経過がある。</h3>
    <Bars labels={profit.labels} values={profit.values} />
    <p>当期利益を承継時と比べた回答です。経過期間は一定ではなく、売上の増加率や毎年の成長確率ではありません。</p>
    {Object.values(SUCCESSION_EVIDENCE).map(source => <div key={source.source}>
      <h4>{source.source}</h4>
      <SourceDetails source={source} />
    </div>)}
    <p className={`${shared['note']} ${styles['note']}`}>ゲームは四半期決算の税等を省略した利益を記録します。実調査の当期利益や自己評価とは同一ではなく、率を合わせる調整は行いません。</p>
  </section>;
}
