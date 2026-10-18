import { createContext, useContext } from 'react';

export const GameContext = createContext(null);

export function useGame() {
  const game = useContext(GameContext);
  if (!game) throw new Error('GameProvider が必要です。');
  return game;
}
