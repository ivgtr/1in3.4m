import React, { lazy } from 'react';
import { GameViewBoundary } from '../game/GameViewBoundary.jsx';
import { Link } from '@tanstack/react-router';
import { useSession } from '../game/SessionContext.jsx';
import shared from '../components/shared.module.css';

const CompanyHistoryPage = lazy(() => import('./CompanyHistoryPage.jsx').then(module => ({ default: module.CompanyHistoryPage })));

export function HistoryPage() {
  const { active } = useSession();
  if (active) return <GameViewBoundary label="全日誌"><CompanyHistoryPage /></GameViewBoundary>;
  return <main className={shared.page}><div className={shared['button-row']}><Link to="/">会社へ戻る</Link></div><h1>この会社が、歩いてきたこと</h1><p>まだ会社の記録はありません。</p></main>;
}
