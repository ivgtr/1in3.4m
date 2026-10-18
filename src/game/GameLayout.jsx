import React, { lazy, useEffect } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import { AppFrame } from '../components/AppFrame.jsx';
import { SessionError } from '../components/SessionError.jsx';
import { Button } from '../components/Button.jsx';
import { PlaybackControls } from '../components/PlaybackControls.jsx';
import { Notification } from '../components/Notification.jsx';
import { currentLeader } from '../domain/model.js';
import { useGame } from './GameContext.jsx';
import { GameViewBoundary } from './GameViewBoundary.jsx';
import { dateAt } from './format.js';

const GameDialogs = lazy(() => import('../components/GameDialogs.jsx').then(module => ({ default: module.GameDialogs })));
const DecisionFlow = lazy(() => import('../components/DecisionFlow.jsx').then(module => ({ default: module.DecisionFlow })));

export function GameLayout() {
  const { state, initialError, actions, dialogs, notification } = useGame();
  const pathname = useRouterState({ select: router => router.location.pathname });
  const routeLoading = useRouterState({ select: router => router.isLoading });
  const navigate = useNavigate();
  useEffect(() => { actions.setRoutePaused(pathname !== '/' || routeLoading); }, [pathname, routeLoading]);
  if (initialError) return <SessionError message={initialError} />;
  const leader = state && currentLeader(state);
  const hasDecision = pathname === '/' && (state?.pending || state?.decisionReceipt);
  const showingDecision = hasDecision && (state.decisionReceipt || !state.decisionHeld);
  return <AppFrame companyName={state?.name}
    menu={state ? <Button onClick={() => actions.open('company')}>会社のこと</Button> : undefined}
    heading={state && <>
      <div className={styles['present-heading']}>
        <div><span className={`${shared.eyebrow} ${styles.eyebrow}`}>創業から</span><strong className={styles['company-age']}>{Math.floor(state.calendarMonth / 12)}<small>年</small>{state.calendarMonth % 12}<small>か月</small></strong></div>
        <p className={styles['current-president']}>第{leader.number}代社長 <b>{leader.name}</b><small>{dateAt(state.calendarMonth)}</small></p>
      </div>
      {pathname === '/' && !state.ended && !state.suspended && !state.checkpoint && <PlaybackControls />}
    </>}
    overlays={<>
      {hasDecision && <GameViewBoundary label="相談・結果" visible={!!showingDecision} showNotification={dialogs.length === 0} onClose={state.decisionReceipt ? undefined : actions.hold}>
        <DecisionFlow />
      </GameViewBoundary>}
      {dialogs.length > 0 && <GameViewBoundary label="会社メニュー" showNotification onClose={actions.closeDialogs}>
        <GameDialogs onNavigate={path => navigate({ to: path })} />
      </GameViewBoundary>}
    </>}
  >
    {notification && dialogs.length === 0 && !showingDecision && <Notification floating />}
    <Outlet />
  </AppFrame>;
}
