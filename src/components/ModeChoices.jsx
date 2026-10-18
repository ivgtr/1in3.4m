import React from 'react';
import shared from './shared.module.css';
import styles from './ModeChoices.module.css';
import { AUTO_LABELS } from '../game/session-storage.js';
import { Button } from './Button.jsx';

export function ModeChoices({ preferences, onChange, className = '' }) {
  return <div className={`${shared['button-row']} ${styles['mode-choices']} ${className}`} role="group" aria-label="判断を任せる範囲">{Object.entries(AUTO_LABELS).map(([value, label]) => <Button key={value} aria-pressed={preferences.auto === value} onClick={() => onChange({ auto: value })}>{label}</Button>)}</div>;
}


const modeDescriptions = {
  manual: '選ぶまで時間は停止します。確認付きの判断は、結果を読んで「続ける」で再開します。',
  safe: '通常の相談は自動で返答し、資金と終了の判断では停止します。相談に触れると一時停止し、自分で選べます。',
  all: 'すべての相談で自動返答します。相談に触れると一時停止し、自分で選べます。',
};

export function ModeGuidance({ mode }) {
  return <>
    <p>{modeDescriptions[mode]}</p>
    <p className={shared.note}>「重要判断は確認」は資金相談・借入・資金危機・廃業・売却・合併で停止します。「すべておまかせ」は会社の終了も選び得ます。実行できる選択肢から均等に抽選し、最適解は探しません。</p>
  </>;
}
