import React from 'react';
import shared from './shared.module.css';
import styles from './ModeChoices.module.css';
import { AUTO_LABELS } from '../game/session.js';
import { Button } from './ui.jsx';

export function ModeChoices({ preferences, onChange, className = '' }) {
  return <div className={`${shared['button-row']} ${styles['mode-choices']} ${className}`} role="group" aria-label="判断を任せる範囲">{Object.entries(AUTO_LABELS).map(([value, label]) => <Button key={value} aria-pressed={preferences.auto === value} onClick={() => onChange({ auto: value })}>{label}</Button>)}</div>;
}

