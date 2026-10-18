import React from 'react';
import styles from './ChoiceCard.module.css';
import shared from './shared.module.css';

export function ChoiceCard({ title, description, cost, selected = false, disabled = false, immediate = false, onChoose, children }) {
  return <article className={`${styles['choice-card']} ${selected ? styles['selected'] : ''} ${immediate ? styles['immediate'] : ''} ${disabled ? styles['unavailable'] : ''}`}>
    <button type="button" className={`${shared['button']} ${styles['choice-main']}`} aria-pressed={immediate ? undefined : selected} disabled={disabled} onClick={onChoose}>
      <span className={styles['choice-heading']}>
        <span className={styles['choice-mark']} aria-hidden="true">{immediate ? '↗' : selected ? '●' : '○'}</span>
        <strong>{title}</strong>
      </span>
      {cost != null && <span className={styles['choice-cost']}>{cost}</span>}
      {description && <span className={styles['choice-description']}>{description}</span>}
      {immediate && <span className={styles['choice-mode']}>すぐに返答する <span aria-hidden="true">→</span></span>}
    </button>
    {children && <div className={styles['choice-detail']}>{children}</div>}
  </article>;
}
