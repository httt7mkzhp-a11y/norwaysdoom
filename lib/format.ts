import type { Lang } from "./types";

const loc = (l: Lang) => (l === "nb" ? "nb-NO" : "en-GB");
export const fmtInt = (n: number, l: Lang) => new Intl.NumberFormat(loc(l), { maximumFractionDigits: 0 }).format(Math.round(n));
export const fmtNum = (n: number, l: Lang, d = 1) => new Intl.NumberFormat(loc(l), { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
export const fmtPct = (x: number, l: Lang, d = 0) => `${fmtNum(x * 100, l, d)} %`;

/** mill. NOK -> "12,3 mrd. kr" / "456 mill. kr" */
export function fmtMnok(m: number, l: Lang): string {
  const abs = Math.abs(m);
  if (abs >= 1000) return `${fmtNum(m / 1000, l, abs >= 10000 ? 0 : 1)} ${l === "nb" ? "mrd. kr" : "bn NOK"}`;
  return `${fmtNum(m, l, abs >= 100 ? 0 : 1)} ${l === "nb" ? "mill. kr" : "m NOK"}`;
}
export const fmtNok = (n: number, l: Lang) => `${fmtInt(n, l)} ${l === "nb" ? "kr" : "NOK"}`;
export const fmtDate = (iso: string | null, l: Lang) =>
  iso ? new Intl.DateTimeFormat(loc(l), { dateStyle: "long", timeZone: "Europe/Oslo" }).format(new Date(iso)) : null;
