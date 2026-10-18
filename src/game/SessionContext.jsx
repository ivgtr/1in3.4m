import { createContext, useContext } from 'react';

export const SessionContext = createContext(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('セッションの起動境界が必要です。');
  return session;
}
