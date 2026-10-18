import React, { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import styles from '../App.module.css';
import shared from '../components/shared.module.css';
import { useGame } from '../game/GameContext.jsx';
import { CompanyStatus } from '../components/CompanyStatus.jsx';
import { Diary } from '../components/Diary.jsx';

export function ObservePage() {
  const { state, actions, reading } = useGame();
  const feedRef = useRef(null);
  useEffect(() => { if (!reading && feedRef.current) feedRef.current.scrollTop = 0; }, [reading, state.calendarMonth]);
  return <main className={shared['page']}><div className={styles['journal-layout']}><section className={styles['journal-main']}><Diary reading={reading} onLatest={actions.latest} state={state} onReading={actions.markReading} onEvent={id => actions.open('event', { id })} feedRef={feedRef} /><Link to="/history">すべての記録を読む</Link></section><CompanyStatus state={state} onOpen={kind => actions.open(kind)} onHelp={actions.help} /></div></main>;
}

