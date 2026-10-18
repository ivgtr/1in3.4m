import React from 'react';
import { useSession } from '../game/SessionContext.jsx';
import { Welcome } from '../components/Welcome.jsx';
import { ActiveGamePage } from './ActiveGamePage.jsx';

export function GamePage() {
  const { active, start } = useSession();
  if (!active) return <Welcome onStart={() => start('encounter')} onArchives={() => start('archives')} />;
  return <ActiveGamePage />;
}
