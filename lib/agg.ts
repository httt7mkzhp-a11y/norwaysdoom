import type { Dataset, Flow, Project, Recipient } from "./types";

export interface Filters { year: number; categories: string[]; minMnok: number; maxMnok: number }

export const sum = (xs: Flow[]) => xs.reduce((a, f) => a + f.amount_mnok, 0);

export function yearTotalMnok(ds: Dataset, year: number, categories?: string[]): number {
  return sum(ds.flows.filter((f) => f.year === year && (!categories?.length || categories.includes(f.category_id))));
}

export function years(ds: Dataset): number[] {
  return [...new Set(ds.flows.map((f) => f.year))].sort((a, b) => a - b);
}

/** Faste kroner: beløp i løpende kroner * (kpi_2026_indeks / kpi_år_indeks). cpi_index = 1 for basisåret. */
export function realFactor(ds: Dataset, year: number): number {
  const ys = ds.yearStats.find((y) => y.year === year);
  return ys ? 1 / ys.cpi_index : 1;
}

export function perRecipient(ds: Dataset, f: Filters): Map<string, number> {
  const m = new Map<string, number>();
  for (const fl of ds.flows) {
    if (fl.year !== f.year) continue;
    if (f.categories.length && !f.categories.includes(fl.category_id)) continue;
    m.set(fl.recipient_id, (m.get(fl.recipient_id) ?? 0) + fl.amount_mnok);
  }
  for (const [k, v] of m) if (v < f.minMnok || v > f.maxMnok) m.delete(k);
  return m;
}

export function recipientFlows(ds: Dataset, id: string): Flow[] {
  return ds.flows.filter((f) => f.recipient_id === id);
}

export function projectsFor(ds: Dataset, id: string, year: number): { list: Project[]; year: number } {
  const all = ds.projects.filter((p) => p.recipient_id === id);
  const inYear = all.filter((p) => p.year === year);
  if (inYear.length || !all.length) return { list: sortP(inYear), year };
  const latest = Math.max(...all.map((p) => p.year));
  return { list: sortP(all.filter((p) => p.year === latest)), year: latest };
}
const sortP = (p: Project[]) => [...p].sort((a, b) => b.amount_mnok - a.amount_mnok);

export interface SourceLink { url: string; label: string; verified: boolean; retrievedAt: string | null }
export function sourceLink(ds: Dataset, item: { source_id: string; source_ref: string; verified: boolean }): SourceLink {
  const s = ds.sources.find((x) => x.id === item.source_id);
  const deep = item.verified && item.source_ref.startsWith("http");
  return { url: deep ? item.source_ref : s?.url ?? "#", label: s?.name ?? item.source_id, verified: item.verified, retrievedAt: s?.retrieved_at ?? null };
}

export const byId = (rs: Recipient[]) => new Map(rs.map((r) => [r.id, r]));
