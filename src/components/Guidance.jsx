import React from 'react';
import styles from './Guidance.module.css';

// Presentation only: callers own the lifetime, announcements and actions.
export function Guidance({ title, children, actions, trailing, tone = 'info', className = '' }) {
  return <div className={`${styles.guidance} ${tone === 'error' ? styles.error : ''} ${className}`.trim()}>
    <div className={styles.content}>
      {title && <strong className={styles.title}>{title}</strong>}
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
    {trailing}
  </div>;
}
