"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type PrivacyContextValue = {
  hidden: boolean;
  toggle: () => void;
  /** Masque un montant formaté si le mode confidentialité est actif */
  mask: (value: string) => string;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

const STORAGE_KEY = "pocketbudget-privacy-hidden";

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [hidden, ready]);

  const toggle = useCallback(() => {
    setHidden((value) => !value);
  }, []);

  const mask = useCallback(
    (value: string) => (hidden ? "••••••" : value),
    [hidden]
  );

  return (
    <PrivacyContext.Provider value={{ hidden, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within PrivacyProvider");
  }
  return context;
}
