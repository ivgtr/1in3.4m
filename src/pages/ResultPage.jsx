import React from 'react';
import shared from '../components/shared.module.css';
import styles from '../components/CompanyViews.module.css';
import { Result } from '../components/Result.jsx';
import { useGame } from '../game/GameContext.jsx';
import { exportCompany } from '../game/export-company.js';

export function ResultPage() {
  const { state, actions } = useGame();
  return <main className={`${shared.page} ${styles['result-page']}`}>
    <Result state={state} onContinue={actions.continue} onNew={() => actions.open('new')} onExport={() => exportCompany(state)} onEvent={id => actions.open('event', { id })} />
  </main>;
}
