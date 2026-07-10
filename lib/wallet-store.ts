"use client";

import { useEffect, useState } from "react";
import { loadData, saveData, STORAGE_KEYS } from "@/lib/storage";
import type { WalletData } from "@/lib/retention";
import { DEFAULT_WALLET } from "@/lib/loyalty";

type Listener = (wallet: WalletData) => void;

let cache: WalletData | null = null;
const listeners = new Set<Listener>();

function load(): WalletData {
  return loadData<WalletData>(STORAGE_KEYS.wallet, { ...DEFAULT_WALLET });
}

function persist(next: WalletData): void {
  cache = next;
  saveData(STORAGE_KEYS.wallet, next);
  listeners.forEach((l) => l(next));
}

export function getWallet(): WalletData {
  if (cache == null) cache = load();
  return cache;
}

export function creditWalletCashback(amountRub: number): WalletData {
  const safe = Math.max(0, Math.round(amountRub));
  const current = getWallet();
  const next: WalletData = {
    ...current,
    balance: current.balance + safe,
    totalCashback: current.totalCashback + safe,
    pendingCashback: Math.max(0, current.pendingCashback - safe),
  };
  persist(next);
  return next;
}

export function useWallet(): WalletData {
  const [state, setState] = useState<WalletData>(() => getWallet());

  useEffect(() => {
    setState(getWallet());
    const listener: Listener = (next) => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}

const APPLIED_KEY = STORAGE_KEYS.paymentsApplied;

export function wasPaymentApplied(paymentId: string): boolean {
  const applied = loadData<string[]>(APPLIED_KEY, []);
  return applied.includes(paymentId);
}

export function markPaymentApplied(paymentId: string): void {
  const applied = loadData<string[]>(APPLIED_KEY, []);
  if (applied.includes(paymentId)) return;
  saveData(APPLIED_KEY, [...applied, paymentId]);
}
