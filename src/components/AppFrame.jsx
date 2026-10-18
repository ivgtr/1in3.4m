import React from 'react';
import { Link } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from './shared.module.css';

export function AppFrame({ companyName, menu, heading, children, overlays }) {
  return <div className={styles['app-shell']}>
    <header className={styles.topbar}>
      <div className={styles['top-row']}>
        <Link className={styles.brand} to="/">{companyName ?? '340万分の1'} <span className={styles.version}>0.10.0</span></Link>
        <nav className={`${shared['button-row']} ${styles['button-row']}`} aria-label="会社のメニュー">
          {menu ?? <Link to="/about">遊び方</Link>}
        </nav>
      </div>
      {heading}
    </header>
    {children}
    <footer className={styles.footer}>架空の会社のシミュレーション。実調査とモデル上の仮定を組み合わせています。<Link to="/about">データと遊び方</Link></footer>
    {overlays}
  </div>;
}
