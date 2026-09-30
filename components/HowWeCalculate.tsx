"use client";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { fmtInt, fmtMnok, fmtNum } from "@/lib/format";
import { counterAt } from "@/lib/counter";
import type { Dataset } from "@/lib/types";

export default function HowWeCalculate({ ds, annualNok }: { ds: Dataset; annualNok: number }) {
  const { lang, t } = useLang();
  const c = counterAt(annualNok, Date.now(), ds.meta.currentYear);
  const basis = [...new Set(ds.flows.filter((f) => f.year === ds.meta.currentYear).map((f) => f.basis))].join(", ");
  return (
    <details className="card mt-8 p-5" open>
      <summary className="cursor-pointer font-medium">{t("how.title")}</summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">
        <p><strong>{t("how.estimate")}</strong> {t("how.estimate2")}</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{t("how.s1", { total: fmtMnok(annualNok / 1e6, lang), basis })}</li>
          <li>{t("how.s2", { year: ds.meta.currentYear, secs: fmtInt(c.secondsInYear, lang) })}</li>
          <li>{t("how.s3", { rate: fmtNum(c.perSecond, lang, 0) })}</li>
          <li>{t("how.s4")}</li>
        </ol>
        <p className="num rounded bg-bg p-3 font-mono text-xs">{t("how.formula")}</p>
        <p className="text-muted">{t("how.limits")} <Link className="underline" href="/metode/">{t("how.more")}</Link></p>
      </div>
    </details>
  );
}
