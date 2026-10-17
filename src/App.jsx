import styles from './App.module.css';
import shared from './components/shared.module.css';
import React, { lazy, Suspense, useEffect } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { currentLeader } from './domain/model.js';
import { progressState } from './domain/view-state.js';
import { useGame } from './game/GameProvider.jsx';
import { AUTO_LABELS } from './game/session.js';
import { dateAt } from './game/format.js';
import { Notification } from './components/Notification.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Button, SpeedControls } from './components/ui.jsx';
import { DecisionFlow, Progress } from './components/DecisionFlow.jsx';

const GameDialogs = lazy(() => import('./components/GameDialogs.jsx').then(module => ({ default: module.GameDialogs })));

function CompanyMenu({ onNavigate }) {
  const { actions } = useGame();
  return <ErrorBoundary onError={error => actions.notify('error', `会社メニューを読み込めません。${error.message}`)} fallback={() => <section className={shared.notice}>
    <Notification />
    <p>会社へ戻れます。メニューを再び開くには、通信状態を確認してページを再読み込みしてください。</p>
    <Button onClick={actions.closeDialogs}>会社へ戻る</Button>
    <Button onClick={() => location.reload()}>再読み込み</Button>
  </section>}>
    <Suspense fallback={<p role="status" className={shared.page}>会社メニューを読み込み中…</p>}>
      <GameDialogs onNavigate={onNavigate} />
    </Suspense>
  </ErrorBoundary>;
}

function PlaybackControls() {
  const { state, clock, preferences, actions, autoReady, reading } = useGame();
  const held = state.decisionHeld && state.pending;
  const phase = held ? '判断保留 · 時間は停止中' : state.decisionReceipt ? clock.running ? '結果を表示中 · まもなく日常へ' : '結果確認中 · 時間は停止中' : progressState({ exists: true, ended: !!state.ended, suspended: !!state.suspended, checkpoint: !!state.checkpoint, wanted: clock.wanted, running: clock.running, pending: !!state.pending, auto: autoReady, reading });
  return <section className={styles['transport']} aria-label="時間と見守り方"><div className={styles['playback-controls']}><Button className={styles.primary} variant="primary" onClick={held ? actions.reopen : actions.toggle} disabled={!held && !!state.pending && !autoReady}>{held ? '相談に戻る' : clock.wanted ? 'Ⅱ 停止' : reading ? '▶ 最新から再開' : '▶ 再生'}</Button><SpeedControls speed={preferences.speed} onChange={speed => actions.changePreferences({ speed })} /><Button onClick={() => actions.open('settings')}>{AUTO_LABELS[preferences.auto]} · 設定</Button><Button onClick={actions.step} disabled={!!state.pending || !!state.decisionReceipt || !!state.checkpoint || !!state.suspended || !!state.ended}>1か月進める</Button></div><div className={`${shared['status-line']} ${styles['status-line']}`}><span role="status">{phase}</span>{!state.pending && !state.decisionReceipt && <span>{dateAt(state.calendarMonth)} · 次の決算まで{3 - state.calendarMonth % 3}か月</span>}</div><Progress clock={clock} label={state.pending ? '判断までの経過' : '1か月の経過'} /></section>;
}

export function AppLayout() {
  const { state, initialError, actions, dialogs, notification } = useGame();
  const pathname = useRouterState({ select: router => router.location.pathname });
  const routeLoading = useRouterState({ select: router => router.isLoading });
  const navigate = useNavigate();
  useEffect(() => { actions.setRoutePaused(pathname !== '/' || routeLoading); }, [pathname, routeLoading]);
  if (initialError) return <main className={shared['page']}><p className={`${shared['eyebrow']} ${styles['eyebrow']}`}>記録の読み込み</p><h1>会社を開けませんでした。</h1><p role="alert">{initialError}</p><Button onClick={() => location.reload()}>再読み込み</Button></main>;
  const leader = state && currentLeader(state);
  return <div className={styles['app-shell']}><header className={styles['topbar']}><div className={styles['top-row']}><Link className={styles['brand']} to="/">{state ? state.name : '340万分の1'} <span className={styles['version']}>0.10.0</span></Link><nav className={`${shared['button-row']} ${styles['button-row']}`} aria-label="会社のメニュー">{state ? <Button onClick={() => actions.open('company')}>会社のこと</Button> : <Link to="/about">遊び方</Link>}</nav></div>{state && <><div className={styles['present-heading']}><div><span className={`${shared['eyebrow']} ${styles['eyebrow']}`}>創業から</span><strong className={styles['company-age']}>{Math.floor(state.calendarMonth / 12)}<small>年</small>{state.calendarMonth % 12}<small>か月</small></strong></div><p className={styles['current-president']}>第{leader.number}代社長 <b>{leader.name}</b><small>{dateAt(state.calendarMonth)}</small></p></div>{pathname === '/' && !state.ended && !state.suspended && !state.checkpoint && <PlaybackControls />}</>}</header>{notification && dialogs.length === 0 && !(pathname === '/' && (state?.decisionReceipt || (state?.pending && !state.decisionHeld))) && <div className={styles['page-notification']}><Notification /></div>}<Outlet /><footer className={styles['footer']}>架空の会社のシミュレーション。実調査とモデル上の仮定を組み合わせています。<Link to="/about">データと遊び方</Link></footer>{pathname === '/' && <DecisionFlow />}{dialogs.length > 0 && <CompanyMenu onNavigate={path => navigate({ to: path })} />}</div>;
}
