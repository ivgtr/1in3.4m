import shared from './shared.module.css';
import styles from './Notification.module.css';
import React from 'react';
import { useGame } from '../game/GameContext.jsx';
import { Button } from './Button.jsx';

export function Notification() {
  const { notification, actions } = useGame();
  if (!notification) return null;
  return <div className={`${shared['notice']} ${styles['game-notification']}`}>
    <p role={notification.kind === 'error' ? 'alert' : 'status'}>{notification.message}</p>
    <Button onClick={actions.dismissNotification} aria-label="通知を閉じる">閉じる</Button>
  </div>;
}
