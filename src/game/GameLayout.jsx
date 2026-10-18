import React, { lazy, useEffect } from 'react';
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import { AppFrame } from '../components/AppFrame.jsx';
import { SessionError } from '../components/SessionError.jsx';
import { Button } from '../components/Button.jsx';
import { SpeedControls } from '../components/SpeedControls.jsx';
import { Progress } from '../components/Progress.jsx';
import { Notification } from '../components/Notification.jsx';
import { currentLeader } from '../domain/model.js';
import { progressState } from '../domain/view-state.js';
import { useGame } from './GameContext.jsx';
import { GameViewBoundary } from './GameViewBoundary.jsx';
import { AUTO_LABELS } from './session-storage.js';
import { dateAt } from './format.js';

const GameDialogs = lazy(() => import('../components/GameDialogs.jsx').then(module => ({ default: module.GameDialogs })));
const DecisionFlow = lazy(() => import('../components/DecisionFlow.jsx').then(module => ({ default: module.DecisionFlow })));

function PlaybackControls() {
  const { state, clock, preferences, actions, autoReady, reading } = useGame();
  const held = state.decisionHeld && state.pending;
  const phase = held ? '判断保留 · 時間は停止中' : state.decisionReceipt ? clock.running ? '結果を表示中 · まもなく日常へ' : '結果確認中 · 時間は停止中' : progressState({ exists: true, ended: !!state.ended, suspended: !!state.suspended, checkpoint: !!state.checkpoint, wanted: clock.wanted, running: clock.running, pending: !!state.pending, auto: autoReady, reading });
  return <section className={styles['transport']} aria-label="時間と見守り方"><div className={styles['playback-controls']}><Button className={styles.primary} variant="primary" onClick={held ? actions.reopen : actions.toggle} disabled={!held && !!state.pending && !autoReady}>{held ? '相談に戻る' : clock.wanted ? 'Ⅱ 停止' : reading ? '▶ 最新から再開' : '▶ 再生'}</Button><SpeedControls speed={preferences.speed} onChange={speed => actions.changePreferences({ speed })} /><Button onClick={() => actions.open('settings')}>{AUTO_LABELS[preferences.auto]} · 設定</Button><Button onClick={actions.step} disabled={!!state.pending || !!state.decisionReceipt || !!state.checkpoint || !!state.suspended || !!state.ended}>1か月進める</Button></div><div className={`${shared['status-line']} ${styles['status-line']}`}><span role="status">{phase}</span>{!state.pending && !state.decisionReceipt && <span>{dateAt(state.calendarMonth)} · 次の決算まで{3 - state.calendarMonth % 3}か月</span>}</div><Progress clock={clock} label={state.pending ? '判断までの経過' : '1か月の経過'} /></section>;
}

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
    {notification && dialogs.length === 0 && !showingDecision && <div className={styles['page-notification']}><Notification /></div>}
    <Outlet />
  </AppFrame>;
}
