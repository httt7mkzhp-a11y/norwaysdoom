"use client";
import { counterAt } from "@/lib/counter";
import { useLang } from "@/lib/i18n";
import { fmtMnok, fmtNok } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import type { Dataset } from "@/lib/types";

export default function KeyFigures({ ds, annualNok }: { ds: Dataset; annualNok: number }) {
  const { lang, t } = useLang();
  const now = useNow(1000);
  const year = ds.meta.currentYear;
  const ys = ds.yearStats.find((y) => y.year === year);
  const c = counterAt(annualNok, now ?? Date.now(), year);
  const ready = now !== null;
  const items = [
    { k: "kf.total", v: fmtMnok(c.ytd / 1e6, lang) },
    { k: "kf.perCapita", v: ys?.population ? fmtNok(c.ytd / ys.population, lang) : t("na") },
    { k: "kf.perTaxpayer", v: ys?.taxpayers ? fmtNok(c.ytd / ys.taxpayers, lang) : t("na") },
    { k: "kf.perDay", v: fmtMnok(c.perDay / 1e6, lang) },
  ];
  return (
    <section aria-labelledby="kf-h" className="mt-6">
      <h2 id="kf-h" className="sr-only">{t("kf.title")}</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.k} className="card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted">{t(i.k)}</dt>
            <dd className="num mt-1 font-serif text-2xl">{ready ? i.v : "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">{t("kf.note", { pop: ys?.population ? ys.population.toLocaleString(lang === "nb" ? "nb-NO" : "en-GB") : t("na"), tax: ys?.taxpayers ? ys.taxpayers.toLocaleString(lang === "nb" ? "nb-NO" : "en-GB") : t("na") })}</p>
    </section>
  );
}
