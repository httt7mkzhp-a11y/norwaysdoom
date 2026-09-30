"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "./types";
import { DICT } from "./dict";

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: string, vars?: Record<string, string | number>) => string; loc: <T extends object>(o: T, field: string) => string }
const C = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("nb");
  useEffect(() => {
    try { const s = localStorage.getItem("lang"); if (s === "nb" || s === "en") setLangState(s); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = lang === "nb" ? "nb" : "en"; }, [lang]);
  const setLang = useCallback((l: Lang) => { setLangState(l); try { localStorage.setItem("lang", l); } catch {} }, []);
  const value = useMemo<Ctx>(() => ({
    lang, setLang,
    t: (k, vars) => {
      let s = DICT[lang][k] ?? DICT.nb[k] ?? k;
      if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, String(b));
      return s;
    },
    loc: (o, f) => ((o as Record<string, string>)[`${f}_${lang === "nb" ? "nb" : "en"}`] ?? ""),
  }), [lang, setLang]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useLang() { const v = useContext(C); if (!v) throw new Error("LangProvider mangler"); return v; }
