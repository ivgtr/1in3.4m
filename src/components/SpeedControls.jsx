import React from 'react';
import styles from './SpeedControls.module.css';
import { Button } from './Button.jsx';

export function SpeedControls({ speed, onChange }) {
  return <div className={styles['speed-switch']} role="group" aria-label="時間の速さ">
    {[0.125, 0.25, 0.5, 1, 2].map(value => <Button key={value} aria-pressed={speed === value} aria-label={`時間の速さ ${value / 0.25}倍`} onClick={() => onChange(value)} data-keep-playing>{value / 0.25}×</Button>)}
  </div>;
}
