"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loading } from "@/components/Shell";
import { budgetCats, budgetLines, budgetYears } from "@/lib/agg";
import { useData } from "@/lib/data";
import { fmtDate, fmtMnok, fmtNum, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { catColor } from "@/lib/palette";

const VOTE_URL = (id: string) => `https://www.stortinget.no/no/Saker-og-publikasjoner/Voteringer/?vid=${id}`;

export default function Categories() {
  const { ds, error } = useData();
  const { lang, t, loc } = useLang();
  const [year, setYear] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!ds) return <Loading error={error} />;
  const years = budgetYears(ds);
  if (!years.length) return <p className="py-10 text-center text-muted">{t("cat.na")}</p>;
  const y = year ?? years[years.length - 1];
  const cats = budgetCats(ds);
  const inYear = budgetLines(ds, y);
  const total = inYear.reduce((a, b) => a + b.amount_mnok, 0);
  const series = years.map((yy) => {
    const row: Record<string, number> = { year: yy };
    for (const c of cats) row[c.id] = Math.round(budgetLines(ds, yy).filter((b) => b.category_id === c.id).reduce((a, b) => a + b.amount_mnok, 0)) / 1000;
    return row;
  });
  const retrieved = inYear[0]?.retrieved_at;
  const outOfScope = budgetLines(ds, y, false).filter((b) => !b.in_scope);
  return (
    <>
      <h1 className="font-serif text-3xl">{t("nav.categories")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("cat.intro")}</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="text-sm">{t("cat.budgetYear")}
          <select className="field mt-1 block" value={y} onChange={(e) => setYear(Number(e.target.value))}>{years.slice().reverse().map((yy) => <option key={yy}>{yy}</option>)}</select>
        </label>
        <p className="text-sm text-muted">{t("cat.basis", { total: fmtMnok(total, lang), date: fmtDate(retrieved ?? null, lang) ?? "" })}</p>
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
                formatter={(v: number, n: string) => [fmtMnok(v * 1000, lang), loc(cats.find((c) => c.id === n)!, "name")]} />
              <Legend formatter={(n) => loc(cats.find((c) => c.id === n)!, "name")} wrapperStyle={{ fontSize: 12 }} />
              {cats.map((c) => <Bar key={c.id} dataKey={c.id} stackId="a" fill={catColor(c.id)} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted">{t("cat.unit")} {t("cat.nominal")}</p>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label={t("cat.details")}>
        {cats.map((c) => {
          const lines = inYear.filter((x) => x.category_id === c.id).sort((a, b) => b.amount_mnok - a.amount_mnok);
          const v = lines.reduce((a, b) => a + b.amount_mnok, 0);
          return (
            <article key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg"><span aria-hidden="true" className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: catColor(c.id) }} />{loc(c, "name")}</h3>
                <span className="num text-right font-serif text-xl">{v ? fmtMnok(v, lang) : t("na")}<span className="block font-sans text-xs text-muted">{total && v ? fmtPct(v / total, lang) : ""}</span></span>
              </div>
              <p className="mt-2 text-sm">{loc(c, "description")}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex gap-2"><dt className="text-muted">{t("cat.nature")}:</dt><dd>{t(`nature.${c.nature}`)}</dd></div>
                <div className="flex gap-2"><dt className="text-muted">{t("cat.commitment")}:</dt><dd>{t(`commitment.${c.commitment}`)}</dd></div>
              </dl>
              <p className="mt-1 text-xs text-muted">{loc(c, "commitment_note")}</p>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">{t("cat.lines", { n: lines.length })}</summary>
                <table className="mt-2 w-full text-left text-xs">
                  <thead><tr className="text-muted"><th scope="col">{t("cat.item")}</th><th scope="col">{t("cat.nature")}</th><th scope="col" className="text-right">{t("col.amount")}</th></tr></thead>
                  <tbody>{lines.map((l) => (
                    <tr key={l.chapter + "." + l.post} className="border-t border-line align-top">
                      <td className="py-1 pr-2">{l.chapter}.{l.post} {l.name}<br /><a className="underline" href={l.source_ref} target="_blank" rel="noopener noreferrer">{l.case_ref}</a> · <a className="underline" href={VOTE_URL(l.vote_id)} target="_blank" rel="noopener noreferrer">{t("cat.vote")}</a></td>
                      <td className="pr-2">{l.nature ? t(`nature.${l.nature}`) : ""}{l.commitment === "obligatory" ? `, ${t("commitment.obligatory")}` : ""}</td>
                      <td className="num text-right">{fmtMnok(l.amount_mnok, lang)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </details>
            </article>
          );
        })}
      </section>
      <section className="mt-6" aria-labelledby="out-h">
        <h2 id="out-h" className="font-serif text-xl">{t("cat.out.h")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("cat.out.p")}</p>
        <button className="btn mt-2" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? t("cat.out.hide") : t("cat.out.show", { n: outOfScope.length })}</button>
        {showAll && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead><tr className="text-muted"><th scope="col">{t("cat.item")}</th><th scope="col" className="text-right">{t("col.amount")}</th></tr></thead>
              <tbody>{outOfScope.map((l) => <tr key={l.chapter + "." + l.post} className="border-t border-line"><td className="py-1 pr-2">{l.chapter}.{l.post} {l.chapter_name}: {l.name}</td><td className="num text-right">{fmtMnok(l.amount_mnok, lang)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
