import React, { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import companyStyles from '../components/CompanyViews.module.css';
import { useGame } from '../game/GameProvider.jsx';
import { AUTO_LABELS } from '../game/session.js';
import { exportCompany } from '../game/export-company.js';
import { Button } from '../components/ui.jsx';
import { CompanyStatus, Diary, Result } from '../components/CompanyViews.jsx';
import { StartInsight } from '../components/Evidence.jsx';
import { ModeChoices } from '../components/ModeChoices.jsx';

function Welcome() {
  const { draft, preferences, actions } = useGame();
  if (!draft) return <main className={`${shared['page']} ${styles['entry-page']}`}><p className={`${shared['eyebrow']} ${styles['eyebrow']}`}>一社との出会いから</p><h1>この会社から、<br />始めよう。</h1><p>誰と出会い、何を残す会社になるだろう。</p><Button className={styles.primary} variant="primary" onClick={actions.encounter}>始める</Button><Button onClick={() => actions.open('archives')}>保存した会社</Button><img className={styles['entry-art']} src={`${import.meta.env.BASE_URL}assets/studio.png`} alt="窓辺に机が並ぶ、小さな会社の事務所" /></main>;
  return <main className={`${shared['page']} ${styles['encounter-stage']}`}><p className={`${shared['eyebrow']} ${styles['eyebrow']}`}>今回めぐりあった一社</p><h1>{draft.name}</h1><div className={styles['encounter-cast']}><article><span>01 創業者</span><b>{draft.founder.name}</b><p>{draft.experience}年の経験 · {draft.origin.region}</p></article><article><span>02 最初の仲間</span><b>{draft.people.length ? draft.people.map(person => person.name).join('・') : 'ひとりからの出発'}</b><p>{draft.people.length ? draft.encounter.relation : '最初の仲間との出会いは、これから。'}</p></article><article><span>03 最初の取引</span><b>{draft.clients.length ? draft.clients.map(client => client.name).join('・') : draft.contacts[0].name}</b><p>{draft.clients.length ? 'この相手との契約が、会社の出発点。' : '試作の相談。継続契約はまだありません。'}</p></article></div><p className={styles['encounter-summary']}>{draft.encounter.summary}</p><p>{draft.origin.description}</p><section className={styles['start-modes']}><h2>今回は、どう見守る？</h2><p>今回の操作：<b>{AUTO_LABELS[preferences.auto]}</b>。開始するまで時間も判断も進みません。</p><ModeChoices className={styles['button-row']} preferences={preferences} onChange={actions.changePreferences} /><p className={shared['note']}>「重要判断は確認」は資金と終了の判断で停止。「すべておまかせ」は会社の終了も選び得ます。</p></section><div className={`${shared['button-row']} ${styles['button-row']}`}><Button className={styles.primary} variant="primary" onClick={actions.begin}>{preferences.auto === 'manual' ? '自分で決めながら始める' : 'おまかせで始める'}</Button><Button onClick={actions.encounter}>別の出会いを見る</Button></div><p className={shared['note']}>架空の人物・境遇の抽選です。実企業の分布とは異なります。</p><StartInsight state={draft} /></main>;
}

export function GamePage() {
  const { state, actions, reading } = useGame();
  const feedRef = useRef(null);
  useEffect(() => { if (!reading && feedRef.current) feedRef.current.scrollTop = 0; }, [reading, state?.calendarMonth]);
  if (!state) return <Welcome />;
  if ((state.ended || state.suspended || state.checkpoint) && !state.decisionReceipt && !state.pending) return <main className={`${shared['page']} ${companyStyles['result-page']}`}><Result state={state} onContinue={actions.continue} onNew={() => actions.open('new')} onExport={() => exportCompany(state)} onEvent={id => actions.open('event', { id })} /></main>;
  return <main className={shared['page']}><div className={styles['journal-layout']}><section className={styles['journal-main']}>{state.decisionHeld && <p className={shared['notice']}>相談を保留しています。会社を確かめたら <Button onClick={actions.reopen}>相談に戻る</Button></p>}{reading && <div className={shared['notice']}><span>過去の記録を読んでいるため、一時停止しています。</span><Button onClick={actions.latest}>最新へ戻る</Button><Button onClick={actions.play}>最新から再開</Button></div>}<Diary state={state} onReading={actions.markReading} onEvent={id => actions.open('event', { id })} feedRef={feedRef} /><Link to="/history">すべての記録を読む</Link></section><CompanyStatus state={state} onOpen={kind => actions.open(kind)} onHelp={actions.help} /></div></main>;
}

