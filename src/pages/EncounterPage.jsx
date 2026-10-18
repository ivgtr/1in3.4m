import React from 'react';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import { useGame } from '../game/GameContext.jsx';
import { AUTO_LABELS } from '../game/session-storage.js';
import { Button } from '../components/Button.jsx';
import { ModeChoices } from '../components/ModeChoices.jsx';
import { StartInsight } from '../components/StartInsight.jsx';

export function EncounterPage() {
  const { draft, preferences, actions } = useGame();
  return <main className={`${shared['page']} ${styles['encounter-stage']}`}><p className={`${shared['eyebrow']} ${styles['eyebrow']}`}>今回めぐりあった一社</p><h1>{draft.name}</h1><div className={styles['encounter-cast']}><article><span>01 創業者</span><b>{draft.founder.name}</b><p>{draft.experience}年の経験 · {draft.origin.region}</p></article><article><span>02 最初の仲間</span><b>{draft.people.length ? draft.people.map(person => person.name).join('・') : 'ひとりからの出発'}</b><p>{draft.people.length ? draft.encounter.relation : '最初の仲間との出会いは、これから。'}</p></article><article><span>03 最初の取引</span><b>{draft.clients.length ? draft.clients.map(client => client.name).join('・') : draft.contacts[0].name}</b><p>{draft.clients.length ? 'この相手との契約が、会社の出発点。' : '試作の相談。継続契約はまだありません。'}</p></article></div><p className={styles['encounter-summary']}>{draft.encounter.summary}</p><p>{draft.origin.description}</p><section className={styles['start-modes']}><h2>今回は、どう見守る？</h2><p>今回の操作：<b>{AUTO_LABELS[preferences.auto]}</b>。開始するまで時間も判断も進みません。</p><ModeChoices className={styles['button-row']} preferences={preferences} onChange={actions.changePreferences} /><p className={shared['note']}>「重要判断は確認」は資金と終了の判断で停止。「すべておまかせ」は会社の終了も選び得ます。</p></section><div className={`${shared['button-row']} ${styles['button-row']}`}><Button className={styles.primary} variant="primary" onClick={actions.begin}>{preferences.auto === 'manual' ? '自分で決めながら始める' : 'おまかせで始める'}</Button><Button onClick={actions.encounter}>別の出会いを見る</Button></div><p className={shared['note']}>架空の人物・境遇の抽選です。実企業の分布とは異なります。</p><StartInsight state={draft} /></main>;
}
