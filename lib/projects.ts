"use client";
import { useEffect, useState } from "react";
import type { Dataset } from "./types";

export interface CostEntry {
  id: string; kind: "cost_frame" | "cost_change" | "incurred" | "status" | "decision"; date?: string; amount_mnok?: number; amount_type?: string;
  price_level_year?: number | null; price_level_unknown?: boolean; reason_nb?: string; reason_en?: string; reason_category?: "scope" | "price" | "requirements" | "uncertainty" | "other" | null;
  status?: string; source_url: string; page: number; quote: string; queue_id?: string; reviewed_by: string; reviewed_at: string;
}
export interface QueueDoc { url: string; title: string; case_id: string; case_reference: string; session: string; n_pages: number; n_candidates: number }
export interface CostProject {
  id: string; name_nb: string; name_en: string; agency: string; ministry: string; storting_area: string; status_note?: string | null;
  entries: CostEntry[]; case_ids: string[];
  queue: { generated_at: string; n_candidates: number; n_pending: number; n_documents: number; documents: QueueDoc[]; skipped: { case_id: string; url?: string; reason: string }[] };
}
export interface ProjectsFile { generated_at: string; source_note: string; projects: CostProject[] }

export function useProjects() {
  const [data, setData] = useState<ProjectsFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/data/projects.json").then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then(setData).catch((e) => setError(String(e)));
  }, []);
  return { data, error };
}

/** Faste kroner (basisår = SSB KPI-basis i datasettet) for en post. null hvis prisnivå er ukjent eller KPI mangler. */
export function realMnok(ds: Dataset, e: Pick<CostEntry, "amount_mnok" | "price_level_year">): number | null {
  if (e.amount_mnok == null || !e.price_level_year) return null;
  const k = ds.yearStats.find((y) => y.year === e.price_level_year)?.cpi_index;
  return k ? e.amount_mnok * k : null;
}

export interface FrameChange { first: CostEntry; last: CostEntry; nominalPct: number; realPct: number | null }
/** Endring fra første til siste kostnadsramme. Løpende endring blandes ikke med prisstigning: faste kroner vises ved siden av. */
export function frameChange(ds: Dataset, entries: CostEntry[]): FrameChange | null {
  const fr = entries.filter((e) => e.kind === "cost_frame" && e.amount_mnok != null && e.date).sort((a, b) => a.date!.localeCompare(b.date!));
  if (fr.length < 2) return null;
  const first = fr[0], last = fr[fr.length - 1];
  const r0 = realMnok(ds, first), r1 = realMnok(ds, last);
  return { first, last, nominalPct: last.amount_mnok! / first.amount_mnok! - 1, realPct: r0 && r1 ? r1 / r0 - 1 : null };
}
