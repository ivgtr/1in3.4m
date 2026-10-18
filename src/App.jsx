import React, { lazy, Suspense, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Guidance } from './components/Guidance.jsx';
import { AppFrame } from './components/AppFrame.jsx';
import { SessionError } from './components/SessionError.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import shared from './components/shared.module.css';
import { readStartup } from './game/session-storage.js';
import { SessionContext } from './game/SessionContext.jsx';

const GameRuntime = lazy(() => import('./game/GameRuntime.jsx').then(module => ({ default: module.GameRuntime })));

function readInitialSession() {
  try {
    return { startup: readStartup(localStorage), error: null };
  } catch (error) {
    return { error: `保存データを読み込めません。${error.message}` };
  }
}

export function AppLayout() {
  const [initial] = useState(readInitialSession);
  const [intent, start] = useState(() => initial.startup?.rawCompany != null ? 'resume' : null);
  if (initial.error) return <SessionError message={initial.error} />;
  return <SessionContext.Provider value={{ active: intent !== null, start }}>
    {intent === null ? <AppFrame><Outlet /></AppFrame> :
      <ErrorBoundary fallback={error => <SessionError message={`ゲームを読み込めません。${error.message}`} />}>
        <Suspense fallback={<AppFrame><main className={shared.page}><Guidance><p role="status">会社を読み込み中…</p></Guidance></main></AppFrame>}>
          <GameRuntime startup={initial.startup} intent={intent} />
        </Suspense>
      </ErrorBoundary>}
  </SessionContext.Provider>;
}
