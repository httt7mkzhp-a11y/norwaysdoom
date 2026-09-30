"use client";
import Link from "next/link";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loading } from "@/components/Shell";
import { useData } from "@/lib/data";
import { fmtDate, fmtMnok, fmtNum, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { frameChange, realMnok, useProjects, type CostEntry, type CostProject } from "@/lib/projects";
import type { Dataset } from "@/lib/types";

export default function Projects() {
  const { ds, error } = useData();
  const { data, error: e2 } = useProjects();
  const { lang, t } = useLang();
  if (!ds || !data) return <Loading error={error ?? e2} />;
  return (
    <>
      <h1 className="font-serif text-3xl">{t("nav.projects")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("pr.intro")}</p>
      <p className="mt-1 max-w-3xl text-xs text-muted">{t("pr.updated", { date: fmtDate(data.generated_at, lang) ?? "" })}</p>
      <div className="mt-6 space-y-8">{data.projects.map((p) => <ProjectCard key={p.id} p={p} ds={ds} />)}</div>
    </>
  );
}

function ProjectCard({ p, ds }: { p: CostProject; ds: Dataset }) {
  const { lang, t } = useLang();
  const name = lang === "nb" ? p.name_nb : p.name_en;
  const money = p.entries.filter((e) => e.amount_mnok != null && e.date);
  const change = frameChange(ds, p.entries);
  const base = ds.meta.priceBaseYear;
  const chart = money.filter((e) => e.kind === "cost_frame").map((e) => ({ date: e.date!, nominal: e.amount_mnok!, real: realMnok(ds, e) }));
  return (
    <section className="card p-5" aria-labelledby={`p-${p.id}`}>
      <h2 id={`p-${p.id}`} className="font-serif text-2xl">{name}</h2>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted">{t("pr.agency")}: </dt><dd className="inline">{p.agency}</dd></div>
        <div><dt className="inline text-muted">{t("pr.ministry")}: </dt><dd className="inline">{p.ministry}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-muted">{t("pr.status")}: </dt><dd className="inline">{p.status_note || t("na")}</dd></div>
      </dl>

      {p.entries.length === 0 ? (
        <p className="mt-4 text-sm" role="status">{t("pr.none", { n: p.queue.n_pending, docs: p.queue.n_documents })}</p>
      ) : (
        <>
          {change && (
            <p className="mt-4 text-sm">{t("pr.change", { a: fmtMnok(change.first.amount_mnok!, lang), y0: change.first.date!.slice(0, 4), b: fmtMnok(change.last.amount_mnok!, lang), y1: change.last.date!.slice(0, 4), nom: fmtPct(change.nominalPct, lang, 0) })}{" "}
              {change.realPct === null ? t("pr.real.na") : t("pr.change.real", { real: fmtPct(change.realPct, lang, 0), base: base ?? "" })}</p>
          )}
          {chart.length > 1 && (
            <div className="mt-3 h-64" role="img" aria-label={t("pr.chart.aria")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} tickFormatter={(d) => String(d).slice(0, 4)} />
                  <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} width={56} tickFormatter={(v) => fmtNum(v / 1000, lang, 0)} />
                  <Tooltip formatter={(v: number) => fmtMnok(v, lang)} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, color: "rgb(var(--fg))" }} />
                  <Legend />
                  <Line type="stepAfter" dataKey="nominal" name={t("pr.nominal")} stroke="rgb(var(--accent))" dot />
                  <Line type="stepAfter" dataKey="real" name={t("pr.real", { base: base ?? "" })} stroke="#c7364b" dot connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("pr.date")}</th><th scope="col">{t("pr.type")}</th><th scope="col" className="text-right">{t("pr.nominal")}</th><th scope="col" className="text-right">{t("pr.real", { base: base ?? "" })}</th><th scope="col" className="pl-3">{t("pr.reason")}</th><th scope="col">{t("pr.src")}</th></tr></thead>
              <tbody>{p.entries.map((e) => <Row key={e.id} e={e} ds={ds} />)}</tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-muted">{t("pr.queue", { n: p.queue.n_pending, docs: p.queue.n_documents, date: fmtDate(p.queue.generated_at, lang) ?? "" })}</p>
      <p className="mt-2 text-sm"><Link className="underline" href={`/stortinget/?area=${p.storting_area}`}>{t("pr.votes")}</Link></p>
      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer">{t("pr.docs", { n: p.queue.documents.length })}</summary>
        <ul className="mt-1 list-disc pl-5">{p.queue.documents.map((d) => <li key={d.url}><a className="underline" href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a> ({d.case_reference || d.session}) · {d.n_candidates}</li>)}</ul>
        {p.queue.skipped.some((s) => s.reason.includes("regjeringen.no")) && <p className="mt-1">{t("pr.blocked")}</p>}
      </details>
    </section>
  );
}

function Row({ e, ds }: { e: CostEntry; ds: Dataset }) {
  const { lang, t } = useLang();
  const real = realMnok(ds, e);
  const reason = lang === "nb" ? e.reason_nb : e.reason_en;
  return (
    <tr className="border-t border-line align-top">
      <td className="py-1.5 pr-2">{e.date ?? "—"}</td>
      <td className="pr-2">{t(`pr.kind.${e.kind}`)}{e.amount_type ? ` (${e.amount_type})` : ""}{e.status ? `: ${e.status}` : ""}</td>
      <td className="num text-right">{e.amount_mnok != null ? fmtMnok(e.amount_mnok, lang) : "—"}{e.price_level_year ? <span className="block text-xs text-muted">{t("pr.pl", { y: e.price_level_year })}</span> : null}</td>
      <td className="num text-right">{real != null ? fmtMnok(real, lang) : e.amount_mnok != null ? t("na") : "—"}</td>
      <td className="pl-3">{reason || "—"}{e.reason_category ? <span className="block text-xs text-muted">{t(`pr.cause.${e.reason_category}`)}</span> : null}</td>
      <td><a className="underline" href={`${e.source_url}#page=${e.page}`} target="_blank" rel="noopener noreferrer">{t("pr.page", { n: e.page })}</a><span className="block text-xs text-muted">«{e.quote.length > 140 ? e.quote.slice(0, 140) + " …" : e.quote}»</span></td>
    </tr>
  );
}
