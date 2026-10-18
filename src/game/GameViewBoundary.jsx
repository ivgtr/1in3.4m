import React, { Suspense, useId, useLayoutEffect } from 'react';
import { useGame } from './GameContext.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { Button } from '../components/Button.jsx';
import { Notification } from '../components/Notification.jsx';
import { Guidance } from '../components/Guidance.jsx';

function LoadingView({ label, onClose, showNotification }) {
  const { clock } = useGame();
  const id = useId();
  useLayoutEffect(() => {
    const reason = `view:${id}`;
    clock.block(reason, true);
    return () => clock.block(reason, false);
  }, [clock, id]);
  return <>
    {showNotification && <Notification floating />}
    <Guidance actions={onClose && <Button onClick={onClose}>会社へ戻る</Button>}>
      <p role="status">{label}を読み込み中…</p>
    </Guidance>
  </>;
}

// A required view must be visible before the simulation or an automatic choice resumes.
export function GameViewBoundary({ label, children, onClose, showNotification = false, visible = true }) {
  const { actions } = useGame();
  return <ErrorBoundary onError={error => actions.notify('error', `${label}を読み込めません。${error.message}`)} fallback={() => visible && <>
    {showNotification && <Notification floating />}
    <Guidance title={`${label}を表示できません。`} tone="error" actions={<>
      {onClose && <Button onClick={onClose}>会社へ戻る</Button>}
      <Button onClick={() => location.reload()}>再読み込み</Button>
    </>}>
      <p>通信状態を確認してから再読み込みしてください。保存データは変更していません。</p>
    </Guidance>
  </>}>
    <Suspense fallback={visible && <LoadingView label={label} onClose={onClose} showNotification={showNotification} />}>
      {children}
    </Suspense>
  </ErrorBoundary>;
}
