"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const HIDE_NAV_CLASS = "hide-nav";

type DonateUiContextValue = {
  isDonateOpen: boolean;
  setDonateOpen: (open: boolean) => void;
  isFighterModalOpen: boolean;
  setFighterModalOpen: (open: boolean) => void;
  isNavHidden: boolean;
};

const DonateUiContext = createContext<DonateUiContextValue | null>(null);

export function DonateUiProvider({ children }: { children: ReactNode }) {
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isFighterModalOpen, setIsFighterModalOpen] = useState(false);

  const isNavHidden = isDonateOpen || isFighterModalOpen;

  const setDonateOpen = useCallback((open: boolean) => {
    setIsDonateOpen(open);
  }, []);

  const setFighterModalOpen = useCallback((open: boolean) => {
    setIsFighterModalOpen(open);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle(HIDE_NAV_CLASS, isNavHidden);
    return () => document.body.classList.remove(HIDE_NAV_CLASS);
  }, [isNavHidden]);

  const value = useMemo(
    () => ({
      isDonateOpen,
      setDonateOpen,
      isFighterModalOpen,
      setFighterModalOpen,
      isNavHidden,
    }),
    [isDonateOpen, setDonateOpen, isFighterModalOpen, setFighterModalOpen, isNavHidden],
  );

  return (
    <DonateUiContext.Provider value={value}>{children}</DonateUiContext.Provider>
  );
}

export function useDonateUi(): DonateUiContextValue {
  const ctx = useContext(DonateUiContext);
  if (!ctx) {
    throw new Error("useDonateUi must be used within DonateUiProvider");
  }
  return ctx;
}
