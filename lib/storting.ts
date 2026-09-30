"use client";
import { useEffect, useState } from "react";
import { withBase } from "./base";

export interface StArea { id: string; name_nb: string; name_en: string }
export interface StCase {
  id: string; session: string; kind: "statsbudsjett" | "revidert" | "tillegg" | "endring" | "annen"; reference: string; title: string;
  status: string; committee: string; date: string; topics: string[]; areas: string[]; url: string; n_votes: number;
}
export interface StProposal { label: string; short: string; type: string; by_text: string; by_parties: string[]; text: string }
export interface StVote {
  id: string; case_id: string; session: string; time: string; theme: string; order: number; agenda_no: string; adopted: boolean;
  result_type: string; result_text: string; personal: boolean; n_for: number; n_against: number; n_absent: number;
  parties: Record<string, [number, number, number]> | null; proposals: StProposal[]; areas: string[];
}
export interface StIndex {
  meta: { source: string; source_url: string; license: string; retrieved_at: string; sessions: string[]; n_cases: number; n_votes: number; n_personal_votes: number; note_nb: string };
  parties: { id: string; name: string }[]; committees: { id: string; name: string }[]; areas: StArea[]; cases: StCase[]; votes: StVote[];
}
export type Rep = { name: string; party: string; party_name: string; county: string };
export type RepVotes = Record<string, Record<string, "f" | "m" | "a">>;

export const pct = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

/** Filtrering av voteringer. Alle felt er valgfrie. */
export interface StFilter { q: string; party: string; committee: string; area: string; from: string; to: string; result: "" | "adopted" | "rejected"; recordedOnly: boolean }
export function filterVotes(idx: StIndex, f: StFilter): StVote[] {
  const cases = new Map(idx.cases.map((c) => [c.id, c]));
  const q = f.q.trim().toLowerCase();
  return idx.votes.filter((v) => {
    const c = cases.get(v.case_id);
    if (!c) return false;
    if (q && !`${c.title} ${c.reference} ${v.theme} ${v.proposals.map((p) => p.label + " " + p.text).join(" ")}`.toLowerCase().includes(q)) return false;
    if (f.party && !(v.parties && f.party in v.parties)) return false;
    if (f.committee && c.committee !== f.committee) return false;
    if (f.area && !v.areas.includes(f.area)) return false;
    if (f.from && v.time.slice(0, 10) < f.from) return false;
    if (f.to && v.time.slice(0, 10) > f.to) return false;
    if (f.result === "adopted" && !v.adopted) return false;
    if (f.result === "rejected" && v.adopted) return false;
    if (f.recordedOnly && !v.personal) return false;
    return true;
  });
}

function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return;
    let live = true;
    fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => live && setData(d)).catch((e) => live && setError(String(e)));
    return () => { live = false; };
  }, [url]);
  return { data, error };
}
export const useStIndex = () => useJson<StIndex>(withBase("/data/storting/index.json"));
export const useStReps = (enabled: boolean) => useJson<Record<string, Rep>>(enabled ? withBase("/data/storting/reps.json") : null);
export const useStRepVotes = (session: string | null) => useJson<RepVotes>(session ? withBase(`/data/storting/votes-${session}.json`) : null);
