import React from 'react';
import styles from './Evidence.module.css';

export function Bars({ labels, values, selected = -1 }) {
  const max = Math.max(...values, 1);
  return <div className={styles['distribution']}>
    {labels.map((label, index) => <div className={`${styles['bar-row']} ${index === selected ? styles['mine'] : ''}`} key={label}>
      <span>{label}{index === selected && <small> ← 今回の会社</small>}</span>
      <div className={styles['bar-track']} aria-hidden="true"><i style={{ width: `${values[index] / max * 100}%` }} /></div>
      <strong>{values[index]}%</strong>
    </div>)}
  </div>;
}
