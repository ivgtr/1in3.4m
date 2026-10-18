import React from 'react';
import styles from './Evidence.module.css';
import shared from './shared.module.css';
import { REAL_START, teamBucket } from '../domain/insights.js';
import { num } from '../game/format.js';
import { Bars } from './EvidenceChart.jsx';

export function StartInsight({ state }) {
  const count = state.initial.staff + 1;
  const bucket = teamBucket(count);
  return <section className={styles['evidence-card']}>
    <span className={shared['source-tag']}>実調査 · {REAL_START.year}年度</span>
    <h3>この会社は、{count}人から。</h3>
    <p>公庫融資先の新規開業企業では、{REAL_START.labels[bucket]}での開業が{REAL_START.values[bucket]}%。経営者本人を含む人数です。</p>
    <Bars labels={REAL_START.labels} values={REAL_START.values} selected={bucket} />
    <p className={`${shared['note']} ${styles['note']}`}>人数の回答 {num(REAL_START.n)}社。全企業や受託開発業の分布ではありません。</p>
    <details>
      <summary>出典・対象・比較できること</summary>
      <p>{REAL_START.population}</p>
      <p>{REAL_START.notes}</p>
      <p>調査時点：{REAL_START.observed}</p>
      <a href={`${REAL_START.url}#page=2`} target="_blank" rel="noreferrer">{REAL_START.publisher}「{REAL_START.title}」p.1 ↗</a>
    </details>
  </section>;
}
