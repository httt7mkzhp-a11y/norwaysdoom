/**
 * Teller-matematikk. Telleren er en LINEÆR fordeling av årets vedtatte beløp over året
 * (Europe/Oslo, 1. januar kl. 00:00 til 1. januar neste år). Ikke faktiske transaksjoner.
 */
export function osloYear(now: number): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric" }).format(now));
}

/** 1. januar er alltid vintertid i Oslo (UTC+1), så årsgrensen er 31. des 23:00 UTC. */
export function yearStartMs(year: number): number {
  return Date.UTC(year - 1, 11, 31, 23, 0, 0);
}

export interface CounterState { ytd: number; perSecond: number; perDay: number; fraction: number; secondsInYear: number }

export function counterAt(annualNok: number, now: number, year = osloYear(now)): CounterState {
  const start = yearStartMs(year);
  const end = yearStartMs(year + 1);
  const secondsInYear = (end - start) / 1000;
  const fraction = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const perSecond = annualNok / secondsInYear;
  return { ytd: annualNok * fraction, perSecond, perDay: perSecond * 86400, fraction, secondsInYear };
}
