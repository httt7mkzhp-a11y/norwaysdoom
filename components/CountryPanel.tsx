"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { projectsFor, recipientFlows, sourceLink, sum, years as yrs } from "@/lib/agg";
import { catColor } from "@/lib/palette";
import { useLang } from "@/lib/i18n";
import { fmtDate, fmtMnok, fmtNum, fmtPct } from "@/lib/format";
import type { Dataset, Recipient } from "@/lib/types";
import { Unverified } from "./Shell";

function SourceRef({ ds, item }: { ds: Dataset; item: { source_id: string; source_ref: string; verified: boolean } }) {
  const { lang, t } = useLang();
  const s = sourceLink(ds, item);
  const date = fmtDate(s.retrievedAt, lang);
  return (
    <span className="text-xs text-muted">
      <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
      {" · "}{s.verified ? t("src.retrieved", { date: date ?? "?" }) : t("src.notretrieved")}
    </span>
  );
}

export default function CountryPanel({ ds, r, year, onClose }: { ds: Dataset; r: Recipient; year: number; onClose: () => void }) {
  const { lang, t, loc } = useLang();
  const all = recipientFlows(ds, r.id);
  const inYear = all.filter((f) => f.year === year);
  const total = sum(inYear);
  const cats = ds.categories.map((c) => ({ c, v: sum(inYear.filter((f) => f.category_id === c.id)) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const timeline = yrs(ds).map((y) => {
    const row: Record<string, number> = { year: y };
    for (const c of ds.categories) row[c.id] = Math.round(sum(all.filter((f) => f.year === y && f.category_id === c.id)));
    return row;
  });
  const proj = projectsFor(ds, r.id, year);
  const basis = inYear[0]?.basis;
  const anyUnverified = inYear.some((f) => !f.verified);
  const firstFlow = inYear[0];
  return (
    <aside aria-label={loc(r, "name")} className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl">{loc(r, "name")}</h2>
          <p className="text-xs text-muted">{r.kind === "country" ? r.region : t(`kind.${r.kind}`)}</p>
        </div>
        <button className="btn" onClick={onClose} aria-label={t("panel.close")}>✕</button>
      </div>
      <p className="num mt-4 font-serif text-3xl">{fmtMnok(total, lang)}</p>
      <p className="text-xs text-muted">
        {t("panel.total", { year })}{basis ? ` · ${t(`basis.${basis}`)}` : ""} {anyUnverified && <Unverified />}
      </p>
      {firstFlow && <div className="mt-1"><SourceRef ds={ds} item={firstFlow} /></div>}

      <h3 className="mt-6 text-sm font-semibold">{t("panel.bycat")}</h3>
      <ul className="mt-2 space-y-2">
        {cats.map(({ c, v }) => (
          <li key={c.id}>
            <div className="flex justify-between text-sm"><span>{loc(c, "name")}</span><span className="num">{fmtMnok(v, lang)} · {fmtPct(v / total, lang)}</span></div>
            <div className="mt-1 h-1.5 rounded bg-line" aria-hidden="true"><div className="h-full rounded" style={{ width: `${(v / total) * 100}%`, background: catColor(c.id) }} /></div>
            <p className="mt-1 text-xs text-muted">{t(`nature.${c.nature}`)} · {t(`commitment.${c.commitment}`)}</p>
          </li>
        ))}
        {!cats.length && <li className="text-sm text-muted">{t("panel.none", { year })}</li>}
      </ul>

      <h3 className="mt-6 text-sm font-semibold">{t("panel.timeline")}</h3>
      <div className="mt-2 h-44" role="img" aria-label={t("panel.timeline.aria", { name: loc(r, "name") })}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "rgb(var(--muted))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `'${String(v).slice(2)}`} />
            <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => fmtNum(v, lang, 0)} />
            <Tooltip cursor={{ fill: "rgb(var(--line) / 0.4)" }} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, color: "rgb(var(--fg))", fontSize: 12 }}
              formatter={(v: number, n: string) => [fmtMnok(v, lang), loc(ds.categories.find((c) => c.id === n)!, "name")]} />
            {ds.categories.map((c) => <Bar key={c.id} dataKey={c.id} stackId="a" fill={catColor(c.id)} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted">{t("panel.unit.mnok")}</p>

      <h3 className="mt-6 text-sm font-semibold">{t("panel.projects", { year: proj.year })}</h3>
      {proj.list.length ? (
        <ul className="mt-2 divide-y divide-line">
          {proj.list.slice(0, 6).map((p) => (
            <li key={p.id} className="py-2">
              <div className="flex justify-between gap-2 text-sm"><span className="font-medium">{loc(p, "title")}</span><span className="num shrink-0">{fmtMnok(p.amount_mnok, lang)}</span></div>
              <p className="text-xs text-muted">{loc(p, "purpose")}</p>
              <p className="text-xs text-muted">{t("panel.grantee")}: {p.grantee} {!p.verified && <Unverified />}</p>
              <SourceRef ds={ds} item={p} />
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-sm text-muted">{t("panel.noprojects")}</p>}
    </aside>
  );
}
