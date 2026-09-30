import { describe, expect, it } from "vitest";
import { filterVotes, pct, type StFilter, type StIndex, type StVote } from "@/lib/storting";

const vote = (o: Partial<StVote>): StVote => ({ id: "1", case_id: "c1", session: "2025-2026", time: "2026-01-10T10:00:00", theme: "Forslag nr. 1", order: 1, agenda_no: "1",
  adopted: true, result_type: "", result_text: "", personal: true, n_for: 2, n_against: 1, n_absent: 0, parties: { A: [2, 0, 0], H: [0, 1, 0] }, proposals: [], areas: [], ...o });
const idx = { cases: [{ id: "c1", committee: "UFK", title: "Statsbudsjettet 2026", reference: "Prop. 1 S" }, { id: "c2", committee: "FINANS", title: "Follobanen", reference: "Innst. 9 S" }],
  votes: [vote({}), vote({ id: "2", case_id: "c2", time: "2025-03-01T10:00:00", adopted: false, personal: false, parties: null, areas: ["follobanen"] })] } as unknown as StIndex;
const base: StFilter = { q: "", party: "", committee: "", area: "", from: "", to: "", result: "", recordedOnly: false };

describe("filterVotes", () => {
  it("filtrerer på søk, parti, komité, område, periode og utfall", () => {
    expect(filterVotes(idx, base)).toHaveLength(2);
    expect(filterVotes(idx, { ...base, q: "follo" }).map((v) => v.id)).toEqual(["2"]);
    expect(filterVotes(idx, { ...base, party: "H" }).map((v) => v.id)).toEqual(["1"]);
    expect(filterVotes(idx, { ...base, committee: "FINANS" }).map((v) => v.id)).toEqual(["2"]);
    expect(filterVotes(idx, { ...base, area: "follobanen" }).map((v) => v.id)).toEqual(["2"]);
    expect(filterVotes(idx, { ...base, from: "2026-01-01" }).map((v) => v.id)).toEqual(["1"]);
    expect(filterVotes(idx, { ...base, result: "rejected" }).map((v) => v.id)).toEqual(["2"]);
    expect(filterVotes(idx, { ...base, recordedOnly: true }).map((v) => v.id)).toEqual(["1"]);
  });
  it("pct håndterer tom nevner", () => { expect(pct(1, 0)).toBe(0); expect(pct(1, 4)).toBe(0.25); });
});
