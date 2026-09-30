"use client";
import { useMemo, useState } from "react";
import { Loading, Unverified } from "@/components/Shell";
import { realFactor, sum, years as yrs } from "@/lib/agg";
import { committedShare, equivalents, taxCoverage } from "@/lib/calc";
import { useData } from "@/lib/data";
import { fmtMnok, fmtNok, fmtNum, fmtPct } from "@/lib/format";
import { useLang } from "@/lib/i18n";

export default function WhatIf() {
  const { ds, error, recipients } = useData();
  const { lang, t, loc } = useLang();
  const [amountBn, setAmountBn] = useState(10);
  const [pick, setPick] = useState("custom");
  const [year, setYear] = useState<number | null>(null);
  const [taxId, setTaxId] = useState("wealth_tax");

  const y = year ?? ds?.meta.currentYear ?? 0;
  const presets = useMemo(() => {
    if (!ds) return [] as { id: string; label: string; mnok: number }[];
    const inY = ds.flows.filter((f) => f.year === y);
    const out = [{ id: "total", label: t("calc.p.total"), mnok: sum(inY) }];
    for (const c of ds.categories) out.push({ id: `cat:${c.id}`, label: loc(c, "name"), mnok: sum(inY.filter((f) => f.category_id === c.id)) });
    for (const r of ds.recipients.filter((x) => x.kind === "country")) {
      const v = sum(inY.filter((f) => f.recipient_id === r.id));
      if (v > 0) out.push({ id: `rec:${r.id}`, label: loc(r, "name"), mnok: v });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, y, lang]);
  if (!ds) return <Loading error={error} />;

  const preset = presets.find((p) => p.id === pick);
  const amountMnok = preset ? preset.mnok : amountBn * 1000;
  const ys = ds.yearStats.find((s) => s.year === ds.meta.currentYear);
  const inY = ds.flows.filter((f) => f.year === y);
  const byCat: Record<string, number> = {};
  for (const f of inY) byCat[f.category_id] = (byCat[f.category_id] ?? 0) + f.amount_mnok;
  const tax = ds.taxItems.find((x) => x.id === taxId)!;
  const cov = taxCoverage(amountMnok, tax);
  const committed = pick === "custom" ? null : pick === "total" ? committedShare(byCat, ds.categories) : pick.startsWith("cat:") ? committedShare({ [pick.slice(4)]: amountMnok }, ds.categories) : null;
  const realNote = y !== ds.meta.currentYear && <p className="text-xs text-muted">{t("calc.realnote", { y, f: fmtNum(realFactor(ds, y), lang, 2) })}</p>;
  const pct = (e: { value: number; low: number; high: number }) => `${fmtPct(e.value, lang)} (${fmtPct(e.low, lang)}–${fmtPct(e.high, lang)})`;

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
        <label className="text-sm">{t("filter.year")}
          <select className="field mt-1 block w-full" value={y} onChange={(e) => setYear(Number(e.target.value))}>{yrs(ds).slice().reverse().map((yy) => <option key={yy}>{yy}</option>)}</select>
        </label>
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
        <p className="num font-serif text-3xl md:col-span-2">{fmtMnok(amountMnok, lang)} {preset && ds.meta.dataMode !== "live" && <Unverified />}</p>
        {realNote}
      </section>

      <section className="mt-6" aria-labelledby="eq-h">
        <h2 id="eq-h" className="font-serif text-xl">{t("calc.step2")}</h2>
        <p className="text-sm text-muted">{t("calc.eq.note")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ds.unitCosts.map((u) => {
            const e = equivalents(amountMnok, u);
            const src = ds.sources.find((s) => s.id === u.source_id);
            return (
              <article key={u.id} className="card p-4">
                <p className="num font-serif text-3xl">{fmtNum(e.value, lang, 0)}</p>
                <p className="text-sm">{loc(u, "unit")}</p>
                <p className="num text-xs text-muted">{t("calc.range")}: {fmtNum(e.low, lang, 0)}–{fmtNum(e.high, lang, 0)}</p>
                <p className="mt-2 text-xs text-muted">{loc(u, "label")}: {fmtNok(u.value_nok, lang)} ({fmtNok(u.low_nok, lang)}–{fmtNok(u.high_nok, lang)}), {t("calc.prices", { year: u.price_year })}</p>
                <p className="mt-1 text-xs"><a className="underline" href={u.source_url} target="_blank" rel="noopener noreferrer">{src?.name ?? u.source_id}</a> {!u.verified && <Unverified />}</p>
              </article>
            );
          })}
          <article className="card p-4">
            <p className="num font-serif text-3xl">{ys ? fmtNok(amountMnok * 1e6 / ys.population, lang) : "—"}</p>
            <p className="text-sm">{t("calc.perCapita")}</p>
            <p className="mt-2 text-xs text-muted">{t("calc.perCapita.note", { year: ds.meta.currentYear })} {ys && !ys.verified && <Unverified />}</p>
          </article>
        </div>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="tax-h">
        <h2 id="tax-h" className="font-serif text-xl">{t("calc.tax.title")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">{t("calc.tax.intro")}</p>
        <label className="mt-3 block text-sm">{t("calc.tax.pick")}
          <select className="field mt-1 block w-full max-w-md" value={taxId} onChange={(e) => setTaxId(e.target.value)}>{ds.taxItems.map((x) => <option key={x.id} value={x.id}>{loc(x, "label")}</option>)}</select>
        </label>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-wide text-muted">{t("calc.tax.lost")}</dt>
            <dd className="num font-serif text-2xl">{fmtMnok(cov.revenueMnok, lang)}<span className="block font-sans text-xs text-muted">{fmtMnok(cov.lowMnok, lang)}–{fmtMnok(cov.highMnok, lang)}</span></dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted">{t("calc.tax.cuts")}</dt><dd className="num font-serif text-2xl">{fmtMnok(amountMnok, lang)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-muted">{t("calc.tax.coverage")}</dt><dd className="num font-serif text-2xl">{pct(cov.coverage)}</dd></div>
        </dl>
        <div className="mt-3 h-2 rounded bg-line" role="img" aria-label={t("calc.tax.bar", { p: fmtPct(Math.min(1, cov.coverage.value), lang) })}>
          <div className="h-full rounded bg-accent" style={{ width: `${Math.min(100, cov.coverage.value * 100)}%` }} />
        </div>
        <p className="mt-3 text-sm font-medium" role="status">
          {cov.gapMnok > 0 ? t("calc.tax.gap", { gap: fmtMnok(cov.gapMnok, lang) }) : t("calc.tax.surplus", { s: fmtMnok(-cov.gapMnok, lang) })}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-muted">{loc(tax, "note")}</p>
        <p className="mt-1 text-xs"><a className="underline" href={tax.source_url} target="_blank" rel="noopener noreferrer">{ds.sources.find((s) => s.id === tax.source_id)?.name}</a> · {t("calc.prices", { year: tax.price_year })} {!tax.verified && <Unverified />}</p>
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
