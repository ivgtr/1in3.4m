import React from 'react';
import styles from './Evidence.module.css';
import shared from './shared.module.css';
import { EVIDENCE } from '../domain/evidence.js';

export function SourceDetails({ source }) {
  return <details>
    <summary>対象・調査時点・出典・限界</summary>
    <p>{source.population}</p>
    <p>調査・観測時点：{source.observed}</p>
    <p>{source.limit}</p>
    <a href={source.url} target="_blank" rel="noreferrer">{source.source} · {source.page} ↗</a>
  </details>;
}

export function EvidenceCard({ kind, title, children }) {
  const source = EVIDENCE[kind];
  return <section className={styles['evidence-card']}>
    <span className={shared['source-tag']}>{source.kind}</span>
    <h3>{title}</h3>
    {children}
    <SourceDetails source={source} />
  </section>;
}
