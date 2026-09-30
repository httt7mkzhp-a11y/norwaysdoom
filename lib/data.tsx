"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Category, Dataset, Recipient } from "./types";

interface Ctx { ds: Dataset | null; error: string | null; recipients: Map<string, Recipient>; categories: Map<string, Category> }
const C = createContext<Ctx>({ ds: null, error: null, recipients: new Map(), categories: new Map() });

export function DataProvider({ children }: { children: ReactNode }) {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/data/dataset.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setDs)
      .catch((e) => setError(String(e)));
  }, []);
  const value = useMemo<Ctx>(() => ({
    ds, error,
    recipients: new Map(ds?.recipients.map((r) => [r.id, r])),
    categories: new Map(ds?.categories.map((c) => [c.id, c])),
  }), [ds, error]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useData = () => useContext(C);
