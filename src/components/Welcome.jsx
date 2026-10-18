import React from 'react';
import styles from '../App.module.css';
import shared from './shared.module.css';
import { Button } from './Button.jsx';

export function Welcome({ onStart, onArchives }) {
  return <main className={`${shared['page']} ${styles['entry-page']}`}><p className={`${shared['eyebrow']} ${styles['eyebrow']}`}>一社との出会いから</p><h1>この会社から、<br />始めよう。</h1><p>誰と出会い、何を残す会社になるだろう。</p><Button className={styles.primary} variant="primary" onClick={onStart}>始める</Button><Button onClick={onArchives}>保存した会社</Button><img className={styles['entry-art']} src={`${import.meta.env.BASE_URL}assets/studio.png`} alt="窓辺に机が並ぶ、小さな会社の事務所" /></main>;
}
