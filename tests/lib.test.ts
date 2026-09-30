import { describe, expect, it } from "vitest";
import { counterAt, osloYear, yearStartMs } from "@/lib/counter";
import { equivalents, taxCoverage, committedShare } from "@/lib/calc";
import { realFactor } from "@/lib/agg";
import type { Dataset } from "@/lib/types";

describe("counter", () => {
  const annual = 100_000_000_000;
  it("starter på null 1. januar kl 00:00 Oslo", () => {
    expect(counterAt(annual, yearStartMs(2026), 2026).ytd).toBe(0);
  });
  it("er halvveis midt i året (ikke-skuddår)", () => {
    const s = yearStartMs(2026), e = yearStartMs(2027);
    expect(counterAt(annual, (s + e) / 2, 2026).ytd).toBeCloseTo(annual / 2, 0);
  });
  it("kapper ved årsslutt og bruker riktig antall sekunder (skuddår)", () => {
    expect(counterAt(annual, yearStartMs(2028) + 1e12, 2027).ytd).toBe(annual);
    expect(counterAt(annual, yearStartMs(2024), 2024).secondsInYear).toBe(366 * 86400);
    expect(counterAt(annual, yearStartMs(2026), 2026).secondsInYear).toBe(365 * 86400);
  });
  it("per sekund * sekunder i året = årsbeløp", () => {
    const c = counterAt(annual, yearStartMs(2026), 2026);
    expect(c.perSecond * c.secondsInYear).toBeCloseTo(annual, 0);
  });
  it("Oslo-året bytter ved midnatt norsk tid, ikke UTC", () => {
    expect(osloYear(Date.UTC(2025, 11, 31, 22, 59, 59))).toBe(2025);
    expect(osloYear(Date.UTC(2025, 11, 31, 23, 0, 0))).toBe(2026);
  });
});

describe("calc", () => {
  const u = { value_nok: 1_000_000, low_nok: 800_000, high_nok: 1_250_000 };
  it("ekvivalenter: lavt anslag bruker høy enhetspris", () => {
    const e = equivalents(1000, u);
    expect(e.value).toBe(1000);
    expect(e.low).toBe(800);
    expect(e.high).toBe(1250);
  });
  it("skattekutt viser provenytap og gap", () => {
    const t = { revenue_mnok: 25000, low_mnok: 20000, high_mnok: 30000 } as never;
    const c = taxCoverage(10000, t);
    expect(c.gapMnok).toBe(15000);
    expect(c.coverage.value).toBeCloseTo(0.4);
    expect(c.coverage.low).toBeCloseTo(1 / 3);
    expect(c.coverage.high).toBeCloseTo(0.5);
  });
  it("bundet andel", () => {
    const cats = [{ id: "a", commitment: "treaty" }, { id: "b", commitment: "political" }] as never;
    expect(committedShare({ a: 25, b: 75 }, cats)).toBeCloseTo(0.25);
    expect(committedShare({}, cats)).toBe(0);
  });
  it("faste kroner", () => {
    const ds = { yearStats: [{ year: 2020, cpi_index: 0.8 }] } as unknown as Dataset;
    expect(realFactor(ds, 2020)).toBeCloseTo(1.25);
    expect(realFactor(ds, 1999)).toBeNull();
  });
});
