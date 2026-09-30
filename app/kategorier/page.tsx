"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loading, Unverified } from "@/components/Shell";
import { realFactor, sum, years as yrs } from "@/lib/agg";
import { useData } from "@/lib/data";
import { fmtMnok, fmtNum, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { catColor } from "@/lib/palette";

export default function Categories() {
  const { ds, error, recipients } = useData();
  const { lang, t, loc } = useLang();
  const [year, setYear] = useState<number | null>(null);
  const [real, setReal] = useState(false);
  if (!ds) return <Loading error={error} />;
  const y = year ?? ds.meta.currentYear;
  const f = (yy: number) => (real ? realFactor(ds, yy) : 1);
  const series = yrs(ds).map((yy) => {
    const row: Record<string, number> = { year: yy };
    for (const c of ds.categories) row[c.id] = Math.round(sum(ds.flows.filter((x) => x.year === yy && x.category_id === c.id)) * f(yy)) / 1000;
    return row;
  });
  const inYear = ds.flows.filter((x) => x.year === y);
  const total = sum(inYear);
  return (
    <>
      <h1 className="font-serif text-3xl">{t("nav.categories")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("cat.intro")}</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="text-sm">{t("filter.year")}
          <select className="field mt-1 block" value={y} onChange={(e) => setYear(Number(e.target.value))}>{yrs(ds).slice().reverse().map((yy) => <option key={yy}>{yy}</option>)}</select>
        </label>
        <div role="group" aria-label={t("hist.price")} className="flex gap-2">
          <button className="chip" aria-pressed={!real} onClick={() => setReal(false)}>{t("hist.nominal")}</button>
          <button className="chip" aria-pressed={real} onClick={() => setReal(true)}>{t("hist.real", { year: ds.meta.currentYear })}</button>
        </div>
      </div>
      <section className="card mt-5 p-5" aria-labelledby="stack-h">
        <h2 id="stack-h" className="font-serif text-xl">{t("cat.stack")}</h2>
        <div className="mt-3 h-72" role="img" aria-label={t("cat.stack.aria")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => fmtNum(v, lang, 0)} />
              <Tooltip cursor={{ fill: "rgb(var(--line) / 0.4)" }} contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, color: "rgb(var(--fg))", fontSize: 12 }}
                formatter={(v: number, n: string) => [fmtMnok(v * 1000, lang), loc(ds.categories.find((c) => c.id === n)!, "name")]} />
              <Legend formatter={(n) => loc(ds.categories.find((c) => c.id === n)!, "name")} wrapperStyle={{ fontSize: 12 }} />
              {ds.categories.map((c) => <Bar key={c.id} dataKey={c.id} stackId="a" fill={catColor(c.id)} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted">{t("cat.unit")}</p>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label={t("cat.details")}>
        {ds.categories.map((c) => {
          const fl = inYear.filter((x) => x.category_id === c.id);
          const v = sum(fl) * f(y);
          const top = Object.entries(fl.reduce<Record<string, number>>((a, x) => ({ ...a, [x.recipient_id]: (a[x.recipient_id] ?? 0) + x.amount_mnok }), {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return (
            <article key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg"><span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: catColor(c.id) }} />{loc(c, "name")}</h3>
                <span className="num text-right font-serif text-xl">{fmtMnok(v, lang)}<span className="block font-sans text-xs text-muted">{total ? fmtPct(sum(fl) / total, lang) : ""}</span></span>
              </div>
              <p className="mt-2 text-sm">{loc(c, "description")}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2"><dt className="text-muted">{t("cat.nature")}:</dt><dd>{t(`nature.${c.nature}`)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted">{t("cat.commitment")}:</dt><dd>{t(`commitment.${c.commitment}`)}</dd></div>
              </dl>
              <p className="mt-1 text-xs text-muted">{loc(c, "commitment_note")}</p>
              {top.length > 0 && <p className="mt-3 text-xs text-muted">{t("cat.top")}: {top.map(([id, a]) => `${loc(recipients.get(id)!, "name")} (${fmtMnok(a * f(y), lang)})`).join(", ")}</p>}
              {fl.some((x) => !x.verified) && <div className="mt-2"><Unverified /></div>}
            </article>
          );
        })}
      </section>
    </>
  );
}
