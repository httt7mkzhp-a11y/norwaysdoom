"use client";
import { useMemo, useState } from "react";
import { Loading } from "@/components/Shell";
import { ABROAD_ODA, budgetCats, budgetLines, budgetYears, sum } from "@/lib/agg";
import { committedShare } from "@/lib/calc";
import { useData } from "@/lib/data";
import { fmtMnok, fmtNok, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function WhatIf() {
  const { ds, error, recipients } = useData();
  const { lang, t, loc } = useLang();
  const [amountBn, setAmountBn] = useState(10);
  const [pick, setPick] = useState("custom");
  const [year, setYear] = useState<number | null>(null);

  const years = ds ? budgetYears(ds) : [];
  const y = year ?? years[years.length - 1] ?? 0;
  const dacYear = ds ? Math.max(...(ds.meta.dacYears ?? [0])) : 0;
  const presets = useMemo(() => {
    if (!ds) return [] as { id: string; label: string; mnok: number }[];
    const lines = budgetLines(ds, y);
    const out: { id: string; label: string; mnok: number }[] = [];
    if (lines.length) {
      out.push({ id: "total", label: `${t("calc.p.total")} ${y}`, mnok: sum0(lines) });
      for (const c of budgetCats(ds)) out.push({ id: `cat:${c.id}`, label: `${loc(c, "name")} ${y}`, mnok: sum0(lines.filter((l) => l.category_id === c.id)) });
    }
    const dac = ds.flows.filter((f) => f.year === dacYear && ABROAD_ODA.includes(f.category_id));
    for (const r of ds.recipients.filter((x) => x.kind === "country")) {
      const v = sum(dac.filter((f) => f.recipient_id === r.id));
      if (v > 0) out.push({ id: `rec:${r.id}`, label: `${loc(r, "name")} (OECD DAC ${dacYear})`, mnok: v });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, y, lang]);
  if (!ds) return <Loading error={error} />;

  const preset = presets.find((p) => p.id === pick);
  const amountMnok = preset ? preset.mnok : amountBn * 1000;
  const popYs = ds.yearStats.filter((s) => s.population).sort((a, b) => b.year - a.year)[0];
  const gdpYs = ds.yearStats.filter((s) => s.gdp_mnok).sort((a, b) => b.year - a.year)[0];
  const byCat: Record<string, number> = {};
  for (const l of budgetLines(ds, y)) if (l.category_id) byCat[l.category_id] = (byCat[l.category_id] ?? 0) + l.amount_mnok;
  const committed = pick === "total" ? committedShare(byCat, budgetCats(ds)) : pick.startsWith("cat:") ? committedShare({ [pick.slice(4)]: amountMnok }, budgetCats(ds)) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl">{t("nav.whatif")}</h1>
        <span className="chip border-warn/50 text-warn">{t("calc.scenario")}</span>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("calc.intro")}</p>

      <section className="card mt-5 grid gap-4 p-5 md:grid-cols-2" aria-labelledby="in-h">
        <h2 id="in-h" className="font-serif text-xl md:col-span-2">{t("calc.step1")}</h2>
        <label className="text-sm">{t("calc.source")}
          <select className="field mt-1 block w-full" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="custom">{t("calc.custom")}</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.label} — {fmtMnok(p.mnok, lang)}</option>)}
          </select>
        </label>
        {years.length > 0 && (
          <label className="text-sm">{t("cat.budgetYear")}
            <select className="field mt-1 block w-full" value={y} onChange={(e) => setYear(Number(e.target.value))}>{years.slice().reverse().map((yy) => <option key={yy}>{yy}</option>)}</select>
          </label>
        )}
        {pick === "custom" && (
          <div className="md:col-span-2">
            <label className="text-sm" htmlFor="amt">{t("calc.amount")}</label>
            <div className="mt-1 flex items-center gap-3">
              <input id="amt" type="range" min={1} max={150} step={1} value={Math.min(amountBn, 150)} onChange={(e) => setAmountBn(Number(e.target.value))} className="w-full accent-[rgb(var(--accent))]" />
              <input aria-label={t("calc.amount")} className="field num w-24" type="number" min={0} value={amountBn} onChange={(e) => setAmountBn(Math.max(0, Number(e.target.value)))} />
              <span className="text-sm">{t("unit.bn")}</span>
            </div>
          </div>
        )}
        <p className="num font-serif text-3xl md:col-span-2">{fmtMnok(amountMnok, lang)}</p>
      </section>

      <section className="mt-6" aria-labelledby="eq-h">
        <h2 id="eq-h" className="font-serif text-xl">{t("calc.step2")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="card p-4">
            <p className="num font-serif text-3xl">{popYs?.population ? fmtNok(amountMnok * 1e6 / popYs.population, lang) : t("na")}</p>
            <p className="text-sm">{t("calc.perCapita")}</p>
            {popYs && <p className="mt-2 text-xs text-muted">{t("calc.perCapita.note", { year: popYs.year })}</p>}
          </article>
          <article className="card p-4">
            <p className="num font-serif text-3xl">{gdpYs?.gdp_mnok ? fmtPct(amountMnok / gdpYs.gdp_mnok, lang, 2) : t("na")}</p>
            <p className="text-sm">{t("calc.share")}</p>
            {gdpYs && <p className="mt-2 text-xs text-muted">{t("calc.share.note", { year: gdpYs.year })}</p>}
          </article>
        </div>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="na-h">
        <h2 id="na-h" className="font-serif text-xl">{t("calc.na.h")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("calc.na.p")}</p>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="ctx-h">
        <h2 id="ctx-h" className="font-serif text-xl">{t("calc.ctx.title")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {committed !== null && <li>{t("calc.ctx.committed", { p: fmtPct(committed, lang) })}</li>}
          <li>{t("calc.ctx.c1")}</li>
          <li>{t("calc.ctx.c2")}</li>
          <li>{t("calc.ctx.c3")}</li>
          {preset?.id.startsWith("rec:") && <li>{t("calc.ctx.recipient", { name: recipients.get(preset.id.slice(4)) ? loc(recipients.get(preset.id.slice(4))!, "name") : "" })}</li>}
        </ul>
        
      </section>
    </>
  );
}

const sum0 = (xs: { amount_mnok: number }[]) => xs.reduce((a, b) => a + b.amount_mnok, 0);
