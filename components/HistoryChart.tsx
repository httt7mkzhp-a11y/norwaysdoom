"use client";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { realFactor, yearTotalMnok, years as yrs } from "@/lib/agg";
import { useLang } from "@/lib/i18n";
import { fmtMnok, fmtNum } from "@/lib/format";
import type { Dataset } from "@/lib/types";

export default function HistoryChart({ ds }: { ds: Dataset }) {
  const { lang, t } = useLang();
  const [real, setReal] = useState(false);
  const rows = useMemo(() => yrs(ds).slice(-10).map((y) => {
    const basis = ds.flows.find((f) => f.year === y)?.basis ?? "regnskap";
    const v = yearTotalMnok(ds, y) * (real ? realFactor(ds, y) : 1);
    return { year: y, bn: v / 1000, mnok: v, basis };
  }), [ds, real]);
  return (
    <section aria-labelledby="hist-h" className="card mt-8 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="hist-h" className="font-serif text-xl">{t("hist.title")}</h2>
        <div role="group" aria-label={t("hist.price")} className="flex gap-2">
          <button className="chip" aria-pressed={!real} onClick={() => setReal(false)}>{t("hist.nominal")}</button>
          <button className="chip" aria-pressed={real} onClick={() => setReal(true)}>{t("hist.real", { year: ds.meta.currentYear })}</button>
        </div>
      </div>
      <div className="mt-4 h-64" role="img" aria-label={t("hist.aria")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => fmtNum(v, lang, 0)} unit="" />
            <Tooltip cursor={{ fill: "rgb(var(--line) / 0.4)" }}
              contentStyle={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--line))", borderRadius: 8, color: "rgb(var(--fg))" }}
              formatter={(_v, _n, p) => [fmtMnok(p.payload.mnok, lang), t(`basis.${p.payload.basis}`)]} labelFormatter={(l) => String(l)} />
            <Bar dataKey="bn" radius={[3, 3, 0, 0]}>
              {rows.map((r) => <Cell key={r.year} fill={r.basis === "regnskap" ? "rgb(var(--accent))" : "rgb(var(--accent) / 0.45)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">{t("hist.legend")}</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">{t("hist.table")}</summary>
        <table className="num mt-2 w-full text-left">
          <thead><tr><th scope="col">{t("col.year")}</th><th scope="col">{t("col.amount")}</th><th scope="col">{t("col.basis")}</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.year} className="border-t border-line"><td>{r.year}</td><td>{fmtMnok(r.mnok, lang)}</td><td>{t(`basis.${r.basis}`)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}
