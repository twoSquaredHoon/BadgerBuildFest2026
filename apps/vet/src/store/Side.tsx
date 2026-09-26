import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * Which side of the app this phone is using. Only the vet side lives in this React app;
 * the pet owner side (PawPlan) is served at /owner/. Remembered so a reload
 * stays on the vet side instead of the start screen.
 */
const KEY = 'bbf-side';

function readIsVet(): boolean {
  try {
    return localStorage.getItem(KEY) === 'vet';
  } catch {
    return false;
  }
}

type SideStore = { isVet: boolean; chooseVet: () => void; backToStart: () => void };

const SideContext = createContext<SideStore | null>(null);

export function SideProvider({ children }: { children: ReactNode }) {
  const [isVet, setIsVet] = useState(readIsVet);

  const chooseVet = useCallback(() => {
    try {
      localStorage.setItem(KEY, 'vet');
    } catch {
      /* storage unavailable: still works for this visit */
    }
    setIsVet(true);
  }, []);

  const backToStart = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setIsVet(false);
  }, []);

  return <SideContext.Provider value={{ isVet, chooseVet, backToStart }}>{children}</SideContext.Provider>;
}

export function useSide(): SideStore {
  const store = useContext(SideContext);
  if (!store) throw new Error('useSide must be used inside SideProvider');
  return store;
}
