import React from 'react';
import styles from '../App.module.css';
import shared from './shared.module.css';
import { useGame } from '../game/GameContext.jsx';
import { AUTO_LABELS } from '../game/session-storage.js';
import { dateAt } from '../game/format.js';
import { Button } from './Button.jsx';
import { SpeedControls } from './SpeedControls.jsx';
import { Progress } from './Progress.jsx';

export function PlaybackAction({ className, variant = 'primary' }) {
  const { progress, actions } = useGame();
  return <Button data-keep-playing className={className} variant={variant}
    disabled={!progress.action} onClick={progress.action ? actions[progress.action] : undefined}>
    {progress.label}
  </Button>;
}

export function ProgressStatus() {
  const { progress } = useGame();
  return <span role="status">{progress.message}</span>;
}

export function PlaybackControls() {
  const { state, clock, preferences, actions, progress } = useGame();
  return <section className={styles.transport} aria-label="時間と見守り方">
    <div className={styles['playback-controls']}>
      <PlaybackAction className={styles.primary} />
      <SpeedControls speed={preferences.speed} onChange={speed => actions.changePreferences({ speed })} />
      <Button onClick={() => actions.open('settings')}>{AUTO_LABELS[preferences.auto]} · 設定</Button>
      <Button onClick={actions.step} disabled={!progress.canStep}>1か月進める</Button>
    </div>
    <div className={`${shared['status-line']} ${styles['status-line']}`}>
      <ProgressStatus />
      {!state.pending && !state.decisionReceipt && <span>{dateAt(state.calendarMonth)} · 次の決算まで{3 - state.calendarMonth % 3}か月</span>}
    </div>
    <Progress clock={clock} label={state.pending ? '判断までの経過' : '1か月の経過'} />
  </section>;
}
