import styles from './Notification.module.css';
import React from 'react';
import { useGame } from '../game/GameContext.jsx';
import { Button } from './Button.jsx';
import { Guidance } from './Guidance.jsx';

export function Notification({ floating = false }) {
  const { notification, actions } = useGame();
  if (!notification) return null;
  const error = notification.kind === 'error';
  return <Guidance title={error ? 'エラーにより停止中' : 'お知らせ'} tone={error ? 'error' : 'info'}
    className={floating ? styles.floating : ''}
    trailing={<Button className={styles.close} variant="ghost" onClick={actions.dismissNotification} aria-label="通知を閉じる"><span aria-hidden="true">×</span></Button>}>
    <p role={error ? 'alert' : 'status'}>{notification.message}</p>
  </Guidance>;
}
