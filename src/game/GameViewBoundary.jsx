import React, { Suspense, useId, useLayoutEffect } from 'react';
import { useGame } from './GameContext.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { Button } from '../components/Button.jsx';
import { Notification } from '../components/Notification.jsx';
import shared from '../components/shared.module.css';

function LoadingView({ label, onClose, showNotification }) {
  const { clock } = useGame();
  const id = useId();
  useLayoutEffect(() => {
    const reason = `view:${id}`;
    clock.block(reason, true);
    return () => clock.block(reason, false);
  }, [clock, id]);
  return <section className={shared.notice}>
    {showNotification && <Notification />}
    <p role="status">{label}を読み込み中…</p>
    {onClose && <Button onClick={onClose}>会社へ戻る</Button>}
  </section>;
}

// A required view must be visible before the simulation or an automatic choice resumes.
export function GameViewBoundary({ label, children, onClose, showNotification = false, visible = true }) {
  const { actions } = useGame();
  return <ErrorBoundary onError={error => actions.notify('error', `${label}を読み込めません。${error.message}`)} fallback={() => visible && <section className={shared.notice}>
    {showNotification && <Notification />}
    <p>{label}を表示できません。通信状態を確認してから再読み込みしてください。保存データは変更していません。</p>
    {onClose && <Button onClick={onClose}>会社へ戻る</Button>}
    <Button onClick={() => location.reload()}>再読み込み</Button>
  </section>}>
    <Suspense fallback={visible && <LoadingView label={label} onClose={onClose} showNotification={showNotification} />}>
      {children}
    </Suspense>
  </ErrorBoundary>;
}
