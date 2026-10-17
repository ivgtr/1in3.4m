import React, { useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { currentLeader } from './domain/model.js';
import { progressState } from './domain/view-state.js';
import { useGame } from './game/GameProvider.jsx';
import { AUTO_LABELS } from './game/session.js';
import { dateAt } from './game/format.js';
import { Button, SpeedControls } from './components/ui.jsx';
import { CompanyStatus, Diary, Result } from './components/CompanyViews.jsx';
import { EvidenceGuide, StartInsight } from './components/Evidence.jsx';
import { DecisionFlow, Progress } from './components/DecisionFlow.jsx';
import { exportCompany, GameDialogs, ModeChoices } from './components/GameDialogs.jsx';

function PlaybackControls() {
  const { state, clock, preferences, actions, autoReady, reading } = useGame();
  const held = state.decisionHeld && state.pending;
  const phase = held ? '判断保留 · 時間は停止中' : state.decisionReceipt ? clock.running ? '結果を表示中 · まもなく日常へ' : '結果確認中 · 時間は停止中' : progressState({ exists: true, ended: !!state.ended, suspended: !!state.suspended, checkpoint: !!state.checkpoint, wanted: clock.wanted, running: clock.running, pending: !!state.pending, auto: autoReady, reading });
  return <section className="transport" aria-label="時間と見守り方"><div className="playback-controls"><Button variant="primary" onClick={held ? actions.reopen : actions.toggle} disabled={!held && !!state.pending && !autoReady}>{held ? '相談に戻る' : clock.wanted ? 'Ⅱ 停止' : reading ? '▶ 最新から再開' : '▶ 再生'}</Button><SpeedControls speed={preferences.speed} onChange={speed => actions.changePreferences({ speed })} /><Button onClick={() => actions.open('settings')}>{AUTO_LABELS[preferences.auto]} · 設定</Button><Button onClick={actions.step} disabled={!!state.pending || !!state.decisionReceipt || !!state.checkpoint || !!state.suspended || !!state.ended}>1か月進める</Button></div><div className="status-line"><span role="status">{phase}</span>{!state.pending && !state.decisionReceipt && <span>{dateAt(state.calendarMonth)} · 次の決算まで{3 - state.calendarMonth % 3}か月</span>}</div><Progress clock={clock} label={state.pending ? '判断までの経過' : '1か月の経過'} /></section>;
}

export function AppLayout() {
  const { state, initialError, actions } = useGame();
  const pathname = useRouterState({ select: router => router.location.pathname });
  const navigate = useNavigate();
  useEffect(() => { actions.setRoutePaused(pathname !== '/'); }, [pathname]);
  if (initialError) return <main className="page"><p className="eyebrow">記録の読み込み</p><h1>会社を開けませんでした。</h1><p role="alert">{initialError}</p><Button onClick={() => location.reload()}>再読み込み</Button></main>;
  const leader = state && currentLeader(state);
  return <div className="app-shell"><header className="topbar"><div className="top-row"><Link className="brand" to="/">{state ? state.name : '340万分の1'} <span className="version">0.10.0</span></Link><nav className="button-row" aria-label="会社のメニュー">{state ? <Button onClick={() => actions.open('company')}>会社のこと</Button> : <Link to="/about">遊び方</Link>}</nav></div>{state && <><div className="present-heading"><div><span className="eyebrow">創業から</span><strong className="company-age">{Math.floor(state.calendarMonth / 12)}<small>年</small>{state.calendarMonth % 12}<small>か月</small></strong></div><p className="current-president">第{leader.number}代社長 <b>{leader.name}</b><small>{dateAt(state.calendarMonth)}</small></p></div>{pathname === '/' && !state.ended && !state.suspended && !state.checkpoint && <PlaybackControls />}</>}</header><Outlet /><footer className="footer">架空の会社のシミュレーション。実調査とモデル上の仮定を組み合わせています。<Link to="/about">データと遊び方</Link></footer>{pathname === '/' && <DecisionFlow />}<GameDialogs onNavigate={path => navigate({ to: path })} /></div>;
}

function Welcome() {
  const { draft, preferences, actions } = useGame();
  if (!draft) return <main className="page entry-page"><p className="eyebrow">一社との出会いから</p><h1>この会社から、<br />始めよう。</h1><p>誰と出会い、何を残す会社になるだろう。</p><Button variant="primary" onClick={actions.encounter}>始める</Button><Button onClick={() => actions.open('archives')}>保存した会社</Button><img className="entry-art" src={`${import.meta.env.BASE_URL}assets/studio.png`} alt="窓辺に机が並ぶ、小さな会社の事務所" /></main>;
  return <main className="page encounter-stage"><p className="eyebrow">今回めぐりあった一社</p><h1>{draft.name}</h1><div className="encounter-cast"><article><span>01 創業者</span><b>{draft.founder.name}</b><p>{draft.experience}年の経験 · {draft.origin.region}</p></article><article><span>02 最初の仲間</span><b>{draft.people.length ? draft.people.map(person => person.name).join('・') : 'ひとりからの出発'}</b><p>{draft.people.length ? draft.encounter.relation : '最初の仲間との出会いは、これから。'}</p></article><article><span>03 最初の取引</span><b>{draft.clients.length ? draft.clients.map(client => client.name).join('・') : draft.contacts[0].name}</b><p>{draft.clients.length ? 'この相手との契約が、会社の出発点。' : '試作の相談。継続契約はまだありません。'}</p></article></div><p className="encounter-summary">{draft.encounter.summary}</p><p>{draft.origin.description}</p><section className="start-modes"><h2>今回は、どう見守る？</h2><p>今回の操作：<b>{AUTO_LABELS[preferences.auto]}</b>。開始するまで時間も判断も進みません。</p><ModeChoices preferences={preferences} onChange={actions.changePreferences} /><p className="note">「重要判断は確認」は資金と終了の判断で停止。「すべておまかせ」は会社の終了も選び得ます。</p></section><div className="button-row"><Button variant="primary" onClick={actions.begin}>{preferences.auto === 'manual' ? '自分で決めながら始める' : 'おまかせで始める'}</Button><Button onClick={actions.encounter}>別の出会いを見る</Button></div><p className="note">架空の人物・境遇の抽選です。実企業の分布とは異なります。</p><StartInsight state={draft} /></main>;
}

export function GamePage() {
  const { state, actions, notice, reading } = useGame();
  const feedRef = useRef(null);
  useEffect(() => { if (!reading && feedRef.current) feedRef.current.scrollTop = 0; }, [reading, state?.calendarMonth]);
  if (!state) return <Welcome />;
  if ((state.ended || state.suspended || state.checkpoint) && !state.decisionReceipt && !state.pending) return <main className="page result-page"><Result state={state} onContinue={actions.continue} onNew={() => actions.open('new')} onExport={() => exportCompany(state)} onEvent={id => actions.open('event', { id })} /></main>;
  return <main className="page"><div className="journal-layout"><section className="journal-main">{notice && <p className="notice" role="status">{notice}</p>}{state.decisionHeld && <p className="notice">相談を保留しています。会社を確かめたら <Button onClick={actions.reopen}>相談に戻る</Button></p>}{reading && <div className="notice"><span>過去の記録を読んでいるため、一時停止しています。</span><Button onClick={actions.latest}>最新へ戻る</Button><Button onClick={actions.play}>最新から再開</Button></div>}<Diary state={state} onReading={actions.markReading} onEvent={id => actions.open('event', { id })} feedRef={feedRef} /><Link to="/history">すべての記録を読む</Link></section><CompanyStatus state={state} onOpen={kind => actions.open(kind)} onHelp={actions.help} /></div></main>;
}

export function HistoryPage() {
  const { state, actions } = useGame();
  return <main className="page"><div className="button-row"><Link to="/">会社へ戻る</Link></div><h1>この会社が、歩いてきたこと</h1>{state ? <Diary state={state} all onEvent={id => actions.open('event', { id })} /> : <p>まだ会社の記録はありません。</p>}</main>;
}

export function AboutPage() {
  return <main className="page"><Link to="/">会社へ戻る</Link><h1>見守り、ときどき決める</h1><p>月ごとに時間が進み、仕事や仲間の相談が届きます。社長が交代しても、会社の時間と歴史は続きます。</p><p>自分で決めるか、重要判断だけを確認するか、すべてを任せるか。おまかせは実行できる選択肢から均等に抽選します。相談に触れると一時停止します。</p><p>記録はこのブラウザ内に保存されます。再読み込み後は停止状態から始まります。URLやブラウザが変わると保存した会社は引き継がれません。</p><EvidenceGuide /><section><h2>340万分の1という名前</h2><p>2021年6月時点の企業数約337.5万者を丸めた名称です。民営・非一次産業の会社と個人事業者を含み、今回の会社の生成確率や現在の企業数ではありません。</p><a href="https://www.chusho.meti.go.jp/koukai/chousa/chu_kigyocnt/2023/231213chukigyocnt.html" target="_blank" rel="noreferrer">中小企業庁の公表資料 ↗</a><p><a href="https://1in8b.life/ja/" target="_blank" rel="noreferrer">80億分の1 / 1 in 8 Billion</a>へのリスペクトから制作しました。公式作品・提携作品ではありません。</p></section></main>;
}
