import React from 'react';
import { Link } from '@tanstack/react-router';
import shared from '../components/shared.module.css';
import { useGame } from '../game/GameProvider.jsx';
import { Diary } from '../components/CompanyViews.jsx';

export function HistoryPage() {
  const { state, actions } = useGame();
  return <main className={shared['page']}><div className={shared['button-row']}><Link to="/">会社へ戻る</Link></div><h1>この会社が、歩いてきたこと</h1>{state ? <Diary state={state} all onEvent={id => actions.open('event', { id })} /> : <p>まだ会社の記録はありません。</p>}</main>;
}

