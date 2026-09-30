import type { Category, TaxItem, UnitCost } from "./types";

export interface Equivalent { value: number; low: number; high: number }

/** Antall enheter beløpet dekker. Lav verdi bruker høy enhetspris og omvendt. */
export function equivalents(amountMnok: number, u: Pick<UnitCost, "value_nok" | "low_nok" | "high_nok">): Equivalent {
  const nok = amountMnok * 1e6;
  return { value: nok / u.value_nok, low: nok / u.high_nok, high: nok / u.low_nok };
}

export interface Coverage { revenueMnok: number; lowMnok: number; highMnok: number; coverage: Equivalent; gapMnok: number }

/**
 * Skattekutt: provenyet staten mister. Dekningsgrad = beløp / proveny (lav dekning ved høyt proveny).
 * gapMnok > 0 betyr at beløpet IKKE dekker provenytapet; < 0 betyr overskudd.
 */
export function taxCoverage(amountMnok: number, t: TaxItem): Coverage {
  return {
    revenueMnok: t.revenue_mnok, lowMnok: t.low_mnok, highMnok: t.high_mnok,
    coverage: { value: amountMnok / t.revenue_mnok, low: amountMnok / t.high_mnok, high: amountMnok / t.low_mnok },
    gapMnok: t.revenue_mnok - amountMnok,
  };
}

const BOUND: Category["commitment"][] = ["treaty", "agreement"];

/** Andel av beløp i kategorier klassifisert som traktat-/avtalefestet (foreløpig klassifisering). */
export function committedShare(byCategory: Record<string, number>, cats: Category[]): number {
  let total = 0, bound = 0;
  for (const c of cats) {
    const v = byCategory[c.id] ?? 0;
    total += v;
    if (BOUND.includes(c.commitment)) bound += v;
  }
  return total ? bound / total : 0;
}
