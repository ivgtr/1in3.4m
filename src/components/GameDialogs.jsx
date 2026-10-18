import { GameViewBoundary } from '../game/GameViewBoundary.jsx';
import { exportCompany } from '../game/export-company.js';
import { ModeChoices } from './ModeChoices.jsx';
import shared from './shared.module.css';
import styles from './GameDialogs.module.css';
import companyViewsStyles from './CompanyViews.module.css';
import React, { lazy, useState } from 'react';
import { eventContext, policyOptions } from '../domain/model.js';
import { useGame } from '../game/GameContext.jsx';
import { readArchives } from '../game/session-storage.js';
import { dateAt, displayText, money } from '../game/format.js';
import { Button } from './Button.jsx';
import { ChoiceCard } from './ChoiceCard.jsx';
import { Dialog } from './Dialog.jsx';
import { SpeedControls } from './SpeedControls.jsx';
import { CompanyDetails } from './CompanyDetails.jsx';
import { Notification } from './Notification.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';

const Generations = lazy(() => import('./Generations.jsx').then(module => ({ default: module.Generations })));
const People = lazy(() => import('./People.jsx').then(module => ({ default: module.People })));
const EvidenceGuide = lazy(() => import('./EvidenceGuide.jsx').then(module => ({ default: module.EvidenceGuide })));

function Policies({ state, onPolicy }) {
  const [selected, setSelected] = useState(null);
  const options = policyOptions(state);
  const chosen = options.find(option => option.id === selected);
  return <><p>備えの費用・期間・条件はゲーム上の仮定です。登録しても時間は進みません。</p><div className={shared['choice-list']}>{options.map(option => <ChoiceCard key={option.id} title={option.title} description={displayText(option.desc)} cost={option.cost ? money(option.cost) : '初期費用なし'} selected={selected === option.id} disabled={!!state.pending || !!state.checkpoint || !!state.suspended || option.cost > state.cash} onChoose={() => setSelected(option.id)} />)}</div>{!options.length && <p>今追加できる備えはありません。</p>}<div className={shared['modal-actions']}><Button variant="primary" disabled={!chosen} onClick={() => onPolicy(chosen.id)}>{chosen ? `${chosen.title} · 確定` : '対応を選んでください'}</Button></div></>;
}

function FamilyForm({ onSave }) {
  const [name, setName] = useState('');
  return <form onSubmit={event => { event.preventDefault(); onSave(name); }}><label className={styles['field']}>候補者の名前<input value={name} maxLength={24} onChange={event => setName(event.target.value)} placeholder="架空の人物名" required /></label><p>登録だけで入社や承継は成立しません。1年間の準備を別途進めます。</p><Button variant="primary" type="submit" disabled={!name.trim()}>候補者として記録する</Button></form>;
}

function EventHistory({ state, id }) {
  const root = state.events.find(event => event.id === id);
  const related = state.events.filter(event => event.id === id || event.entities.some(entity => root.entities.includes(entity)) || event.causes.includes(id));
  return eventContext(state, related.map(event => event.id)).map(event => <article className={companyViewsStyles['diary-event']} key={event.id}><p className={companyViewsStyles['event-meta']}>{dateAt(event.month ?? event.q * 3)}</p><h3>{displayText(event.title)}</h3><p>{displayText(event.text)}</p></article>);
}

function Archives({ onLoad }) {
  const rows = readArchives(localStorage);
  return <div className={styles['archive-list']}>{rows.length ? rows.map(row => <article key={row.id} className={shared['relationship-card']}><h3>{row.name}</h3><p>創業{row.month}か月 · このブラウザに保存</p><Button onClick={() => onLoad(row.id)}>この会社を再開する</Button></article>) : <p>まだ別に保存した会社はありません。</p>}</div>;
}

export function GameDialogs({ onNavigate }) {
  const { state, preferences, dialogs, actions } = useGame();
  function returnToGame(operation) {
    operation();
    onNavigate('/');
  }
  function onAction(kind) {
    if (kind === 'history') { actions.closeDialogs(); onNavigate('/history'); return; }
    if (kind === 'export') { exportCompany(state); return; }
    if (kind === 'continue') { returnToGame(actions.continue); return; }
    if (['leadership', 'strategy', 'exit'].includes(kind)) { returnToGame(actions[kind]); return; }
    if (['save-pause', 'new'].includes(kind)) actions.pause();
    actions.open(kind);
  }
  const titles = { company: '会社のこと', people: 'この会社と、縁のある人たち', generations: '経営者の時代と会社の経過', evidence: '実測・推計・仮定の境界', settings: '見守り方の設定', policies: '備えと資金繰り', family: '家族の後継候補を登録', event: '同じ人物・取引・選択の記録', new: '今の会社を残して、新しい出会いへ', archives: '保存した会社', 'save-pause': '記録を保存して中断' };
  return <>{dialogs.map((dialog, index) => <Dialog key={`${index}-${dialog.kind}`} title={titles[dialog.kind]} size={['company', 'people', 'generations', 'evidence', 'event'].includes(dialog.kind) ? 'wide' : 'medium'} onClose={actions.dismiss} headerActions={index > 0 ? <span className={shared['note']}>閉じると前の画面へ戻ります</span> : null}>
    {index === dialogs.length - 1 && <Notification />}
    {dialog.kind === 'company' && <CompanyDetails state={state} onAction={onAction} onHelp={id => returnToGame(() => actions.help(id))} />}
    {dialog.kind === 'people' && <GameViewBoundary label="人と取引"><People state={state} onEvent={id => actions.open('event', { id })} onContact={id => returnToGame(() => actions.contact(id))} /></GameViewBoundary>}
    {dialog.kind === 'generations' && <GameViewBoundary label="歴代経営者と業績"><Generations state={state} /></GameViewBoundary>}
    {dialog.kind === 'evidence' && <GameViewBoundary label="データと遊び方"><EvidenceGuide /></GameViewBoundary>}
    {dialog.kind === 'settings' && <><h3>時間の速さ</h3><SpeedControls speed={preferences.speed} onChange={speed => actions.changePreferences({ speed })} /><h3>判断を任せる範囲</h3><ModeChoices preferences={preferences} onChange={actions.changePreferences} /><p>{state?.decisionHeld ? '相談を保留中です。時間は停止しています。「相談に戻る」から判断を再開できます。' : preferences.auto === 'manual' ? '選ぶまで時間は停止します。確認付きの判断は、結果を読んで「続ける」で再開します。' : '選択予定を予告してから返答します。相談に触れると一時停止し、自分で決められます。'}</p><p className={shared['note']}>「重要判断は確認」は資金相談・借入・資金危機・廃業・売却・合併で停止します。「すべておまかせ」は会社の終了も選び得ます。実行できる選択肢から均等に抽選し、最適解は探しません。</p></>}
    {dialog.kind === 'policies' && <Policies state={state} onPolicy={id => returnToGame(() => actions.policy(id))} />}
    {dialog.kind === 'family' && <FamilyForm onSave={name => returnToGame(() => actions.family(name))} />}
    {dialog.kind === 'event' && <EventHistory state={state} id={dialog.id} />}
    {dialog.kind === 'new' && <><p>「{state.name}」の{state.calendarMonth}か月の記録と、判断・結果待ちをこのブラウザに保存します。会社は廃業しません。「保存した会社」から再開できます。</p><Button variant="primary" onClick={() => returnToGame(actions.newCompany)}>記録を残して、新しい会社へ</Button></>}
    {dialog.kind === 'archives' && <ErrorBoundary onError={problem => actions.notify('error', `保存した会社の一覧を読み込めません。${problem.message}`)} fallback={() => <><p>保存した会社の一覧を読み込めません。</p><p>この画面を閉じて戻れます。保存データは変更していません。一覧を再び開くには、保存データの読み取りエラーを解消してから開き直してください。</p></>}><Archives onLoad={id => returnToGame(() => actions.loadArchive(id))} /></ErrorBoundary>}
    {dialog.kind === 'save-pause' && <><p>この会社の経過は保存されています。会社は終了していません。閉じた後も、再生を押すまで進みません。</p><Button onClick={() => exportCompany(state)}>記録を書き出す</Button></>}
  </Dialog>)}</>;
}
