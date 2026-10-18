import React, { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import { useGame } from '../game/GameContext.jsx';
import { Button } from '../components/Button.jsx';
import { CompanyStatus } from '../components/CompanyStatus.jsx';
import { Diary } from '../components/Diary.jsx';

export function ObservePage() {
  const { state, actions, reading } = useGame();
  const feedRef = useRef(null);
  useEffect(() => { if (!reading && feedRef.current) feedRef.current.scrollTop = 0; }, [reading, state.calendarMonth]);
  return <main className={shared['page']}><div className={styles['journal-layout']}><section className={styles['journal-main']}>{state.decisionHeld && <p className={shared['notice']}>相談を保留しています。会社を確かめたら <Button onClick={actions.reopen}>相談に戻る</Button></p>}{reading && <div className={shared['notice']}><span>過去の記録を読んでいるため、一時停止しています。</span><Button onClick={actions.latest}>最新へ戻る</Button><Button onClick={actions.play}>最新から再開</Button></div>}<Diary state={state} onReading={actions.markReading} onEvent={id => actions.open('event', { id })} feedRef={feedRef} /><Link to="/history">すべての記録を読む</Link></section><CompanyStatus state={state} onOpen={kind => actions.open(kind)} onHelp={actions.help} /></div></main>;
}

