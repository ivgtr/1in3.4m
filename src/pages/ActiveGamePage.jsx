import React, { lazy } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { GameViewBoundary } from '../game/GameViewBoundary.jsx';
import { Welcome } from '../components/Welcome.jsx';

const EncounterPage = lazy(() => import('./EncounterPage.jsx').then(module => ({ default: module.EncounterPage })));
const ObservePage = lazy(() => import('./ObservePage.jsx').then(module => ({ default: module.ObservePage })));
const ResultPage = lazy(() => import('./ResultPage.jsx').then(module => ({ default: module.ResultPage })));

export function ActiveGamePage() {
  const { state, draft, actions } = useGame();
  if (!state) {
    if (!draft) return <Welcome onStart={actions.encounter} onArchives={() => actions.open('archives')} />;
    return <GameViewBoundary label="創業条件"><EncounterPage /></GameViewBoundary>;
  }
  if ((state.ended || state.suspended || state.checkpoint) && !state.decisionReceipt && !state.pending) {
    return <GameViewBoundary label="会社の振り返り"><ResultPage /></GameViewBoundary>;
  }
  return <GameViewBoundary label="会社の日誌"><ObservePage /></GameViewBoundary>;
}
