"use client";
import { useEffect, useMemo, useState } from "react";
import { Loading } from "@/components/Shell";
import { fmtDate, fmtInt, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { filterVotes, pct, useStIndex, useStRepVotes, useStReps, type StCase, type StFilter, type StIndex, type StVote } from "@/lib/storting";

const EMPTY: StFilter = { q: "", party: "", committee: "", area: "", from: "", to: "", result: "", recordedOnly: false };
const PAGE = 25;
const fmtTime = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === "nb" ? "nb-NO" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(iso));

export default function Storting() {
  const { data: idx, error } = useStIndex();
  const { lang, t } = useLang();
  const [f, setF] = useState<StFilter>(EMPTY);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("area");
    if (a) setF((p) => ({ ...p, area: a }));
  }, []);
  const set = <K extends keyof StFilter>(k: K, v: StFilter[K]) => { setF((p) => ({ ...p, [k]: v })); setShown(PAGE); };
  const votes = useMemo(() => (idx ? filterVotes(idx, f) : []), [idx, f]);
  if (!idx) return <Loading error={error} />;
  const cases = new Map(idx.cases.map((c) => [c.id, c]));
  const parties = [...idx.parties].sort((a, b) => a.name.localeCompare(b.name, "nb"));
  const committees = [...idx.committees].sort((a, b) => a.name.localeCompare(b.name, "nb"));
  const areaName = (id: string) => { const a = idx.areas.find((x) => x.id === id); return a ? (lang === "nb" ? a.name_nb : a.name_en) : id; };

  return (
    <>
      <h1 className="font-serif text-3xl">{t("st.title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("st.intro")}</p>
      <p className="mt-1 max-w-3xl text-xs text-muted">
        {t("st.updated", { date: fmtDate(idx.meta.retrieved_at, lang) ?? "", source: idx.meta.source, license: idx.meta.license })}{" "}
        <a className="underline" href={idx.meta.source_url} target="_blank" rel="noopener noreferrer">{t("st.source")}</a>
      </p>

      <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" role="search" aria-label={t("st.filters")} onSubmit={(e) => e.preventDefault()}>
        <label className="text-sm sm:col-span-2">{t("st.f.q")}
          <input className="field mt-1 block w-full" type="search" value={f.q} onChange={(e) => set("q", e.target.value)} />
        </label>
        <Select label={t("st.f.party")} value={f.party} onChange={(v) => set("party", v)} any={t("st.f.any")} options={parties.map((p) => [p.id, p.name])} />
        <Select label={t("st.f.committee")} value={f.committee} onChange={(v) => set("committee", v)} any={t("st.f.any")} options={committees.map((p) => [p.id, p.name])} />
        <Select label={t("st.f.area")} value={f.area} onChange={(v) => set("area", v)} any={t("st.f.any")} options={idx.areas.map((a) => [a.id, areaName(a.id)])} />
        <Select label={t("st.f.result")} value={f.result} onChange={(v) => set("result", v as StFilter["result"])} any={t("st.f.any")}
          options={[["adopted", t("st.f.adopted")], ["rejected", t("st.f.rejected")]]} />
        <label className="text-sm">{t("st.f.from")}<input className="field mt-1 block w-full" type="date" value={f.from} onChange={(e) => set("from", e.target.value)} /></label>
        <label className="text-sm">{t("st.f.to")}<input className="field mt-1 block w-full" type="date" value={f.to} onChange={(e) => set("to", e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.recordedOnly} onChange={(e) => set("recordedOnly", e.target.checked)} />{t("st.f.recorded")}</label>
        <div className="sm:col-span-2 lg:col-span-1"><button type="button" className="btn" onClick={() => { setF(EMPTY); setShown(PAGE); }}>{t("st.f.reset")}</button></div>
      </form>

      <p className="mt-4 text-sm" role="status">{t("st.n", { n: fmtInt(votes.length, lang), total: fmtInt(idx.votes.length, lang) })}</p>
      <p className="mt-1 max-w-3xl text-xs text-muted">{t("st.neutral")}</p>
      {votes.length === 0 && <p className="py-8 text-center text-muted">{t("st.empty")}</p>}
      <ul className="mt-3 space-y-3">
        {votes.slice(0, shown).map((v) => <li key={v.id}><VoteCard v={v} c={cases.get(v.case_id)!} idx={idx} partyFilter={f.party} areaName={areaName} /></li>)}
      </ul>
      {shown < votes.length && <div className="mt-4 text-center"><button className="btn" onClick={() => setShown(shown + PAGE)}>{t("st.more")}</button></div>}
    </>
  );
}

function Select({ label, value, onChange, any, options }: { label: string; value: string; onChange: (v: string) => void; any: string; options: [string, string][] }) {
  return (
    <label className="text-sm">{label}
      <select className="field mt-1 block w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{any}</option>
        {options.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
      </select>
    </label>
  );
}

function VoteCard({ v, c, idx, partyFilter, areaName }: { v: StVote; c: StCase; idx: StIndex; partyFilter: string; areaName: (id: string) => string }) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const total = v.n_for + v.n_against + v.n_absent;
  return (
    <article className="card p-4" aria-labelledby={`v${v.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`v${v.id}`} className="font-serif text-lg">{c.title}</h2>
        <span className={`chip ${v.adopted ? "border-accent text-accent" : ""}`}>{v.adopted ? t("st.adopted") : t("st.rejected")}</span>
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted">{t("st.date")}: </dt><dd className="inline">{fmtTime(v.time, lang)}</dd></div>
        <div><dt className="inline text-muted">{t("st.ref")}: </dt><dd className="inline">{c.reference}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-muted">{t("st.gjaldt")}: </dt><dd className="inline">{t(`st.kind.${c.kind}`)}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-muted">{t("st.theme")}: </dt><dd className="inline">{v.theme || "–"}</dd></div>
        {v.areas.length > 0 && <div className="sm:col-span-2"><dt className="inline text-muted">{t("st.areas")}: </dt><dd className="inline">{v.areas.map(areaName).join(", ")}</dd></div>}
      </dl>
      {v.personal ? (
        <p className="mt-2 text-sm">{t("st.for")}: <b>{v.n_for}</b> · {t("st.against")}: <b>{v.n_against}</b> · {t("st.absent")}: <b>{v.n_absent}</b> ({t("st.total")} {total})</p>
      ) : <p className="mt-2 text-sm text-muted">{t("st.unrecorded", { result: v.result_text || "–" })}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button className="btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("st.details.hide") : t("st.details.show")}</button>
        <a className="text-sm underline" href={c.url} target="_blank" rel="noopener noreferrer">{t("st.link")}</a>
      </div>
      {open && <Detail v={v} idx={idx} partyFilter={partyFilter} />}
    </article>
  );
}

function Detail({ v, idx, partyFilter }: { v: StVote; idx: StIndex; partyFilter: string }) {
  const { lang, t } = useLang();
  const [showReps, setShowReps] = useState(false);
  const [rq, setRq] = useState("");
  const { data: reps, error: e1 } = useStReps(showReps && v.personal);
  const { data: rv, error: e2 } = useStRepVotes(showReps && v.personal ? v.session : null);
  const names = new Map(idx.parties.map((p) => [p.id, p.name]));
  const rows = v.parties ? Object.entries(v.parties).sort((a, b) => (names.get(a[0]) ?? a[0]).localeCompare(names.get(b[0]) ?? b[0], "nb")) : [];
  const vote = rv?.[v.id];
  const repRows = vote && reps
    ? Object.entries(vote).map(([id, code]) => ({ id, code, ...reps[id] })).filter((r) => (!partyFilter || r.party === partyFilter) && (!rq || r.name.toLowerCase().includes(rq.toLowerCase())))
      .sort((a, b) => (names.get(a.party) ?? a.party).localeCompare(names.get(b.party) ?? b.party, "nb") || a.name.localeCompare(b.name, "nb"))
    : [];
  const label = { f: t("st.for"), m: t("st.against"), a: t("st.absent") };
  return (
    <div className="mt-4 space-y-5 border-t border-line pt-4">
      {v.parties && (
        <section aria-labelledby={`p${v.id}`}>
          <h3 id={`p${v.id}`} className="font-serif text-base">{t("st.parties.h")}</h3>
          <p className="text-xs text-muted">{t("st.parties.note")}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("st.party")}</th><th scope="col" className="text-right">{t("st.for")}</th><th scope="col" className="text-right">{t("st.against")}</th><th scope="col" className="text-right">{t("st.absent")}</th><th scope="col" className="pl-4">{t("st.share")}</th></tr></thead>
              <tbody>
                {rows.map(([id, [a, b, c]]) => {
                  const n = a + b + c;
                  return (
                    <tr key={id} className={`border-t border-line ${id === partyFilter ? "bg-bg" : ""}`}>
                      <th scope="row" className="py-1 pr-2 font-normal">{names.get(id) ?? id}</th>
                      <td className="text-right tabular-nums">{a}</td><td className="text-right tabular-nums">{b}</td><td className="text-right tabular-nums">{c}</td>
                      <td className="pl-4 text-xs tabular-nums text-muted">{fmtPct(pct(a, n), lang)} / {fmtPct(pct(b, n), lang)} / {fmtPct(pct(c, n), lang)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section aria-labelledby={`f${v.id}`}>
        <h3 id={`f${v.id}`} className="font-serif text-base">{t("st.proposals.h")}</h3>
        {v.proposals.length === 0 ? <p className="text-sm text-muted">{t("st.proposal.none")}</p> : (
          <ul className="mt-1 space-y-2 text-sm">
            {v.proposals.map((p, i) => (
              <li key={i}>
                <b>{p.label || p.short}</b>{p.by_text ? <span className="text-muted"> ({t("st.proposal.by")}: {p.by_text.replace(/:$/, "")})</span> : null}
                {p.text && <p className="mt-0.5 text-muted">{p.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {v.personal && (
        <section aria-labelledby={`r${v.id}`}>
          <h3 id={`r${v.id}`} className="font-serif text-base">{t("st.reps.h")}</h3>
          <button className="btn mt-1" aria-expanded={showReps} onClick={() => setShowReps(!showReps)}>{showReps ? t("st.reps.hide") : t("st.reps.show")}</button>
          {showReps && (
            <div className="mt-3">
              {(e1 || e2) && <p role="alert" className="text-sm text-warn">{t("st.load.err")}</p>}
              {!vote && !e1 && !e2 && <p role="status" className="text-sm text-muted">{t("st.loading")}</p>}
              {vote && (
                <>
                  <p className="text-xs text-muted">{t("st.reps.note")}</p>
                  <label className="mt-2 block text-sm">{t("st.reps.search")}<input className="field mt-1 block w-full max-w-xs" type="search" value={rq} onChange={(e) => setRq(e.target.value)} /></label>
                  <div className="mt-2 max-h-96 overflow-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead className="sticky top-0 bg-surface"><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("st.rep")}</th><th scope="col">{t("st.party")}</th><th scope="col">{t("st.county")}</th><th scope="col">{t("st.vote")}</th></tr></thead>
                      <tbody>{repRows.map((r) => (
                        <tr key={r.id} className="border-t border-line"><th scope="row" className="py-1 pr-2 font-normal">{r.name}</th><td className="pr-2">{names.get(r.party) ?? r.party}</td><td className="pr-2">{r.county}</td><td>{label[r.code]}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
