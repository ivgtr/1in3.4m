import React from 'react';
import { GameProvider } from './GameProvider.jsx';
import { GameLayout } from './GameLayout.jsx';

export function GameRuntime({ startup, intent }) {
  return <GameProvider startup={startup} intent={intent}><GameLayout /></GameProvider>;
}
