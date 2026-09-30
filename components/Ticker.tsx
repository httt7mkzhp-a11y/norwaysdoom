"use client";
import { useEffect, useRef } from "react";
import { counterAt } from "@/lib/counter";
import { useLang } from "@/lib/i18n";
import { fmtInt, fmtNum } from "@/lib/format";

/** Teller som oppdateres med requestAnimationFrame. Skriver direkte til DOM for å unngå re-render hver frame. */
export default function Ticker({ annualNok, year }: { annualNok: number; year: number }) {
  const { lang, t } = useLang();
  const big = useRef<HTMLSpanElement>(null);
  const rate = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const nf = new Intl.NumberFormat(lang === "nb" ? "nb-NO" : "en-GB", { maximumFractionDigits: 0 });
    let raf = 0;
    const tick = () => {
      const c = counterAt(annualNok, Date.now(), year);
      if (big.current) big.current.textContent = nf.format(Math.floor(c.ytd));
      raf = requestAnimationFrame(tick);
    };
    tick();
    const c0 = counterAt(annualNok, Date.now(), year);
    if (rate.current) rate.current.textContent = fmtNum(c0.perSecond, lang, 0);
    return () => cancelAnimationFrame(raf);
  }, [annualNok, year, lang]);
  const c = counterAt(annualNok, Date.now(), year);
  return (
    <section aria-labelledby="ticker-h" className="py-6 text-center">
      <h1 id="ticker-h" className="text-sm font-medium uppercase tracking-widest text-muted">{t("ticker.lead", { year })}</h1>
      {/* Visuell teller skjules for skjermlesere (ville lest opp hvert tall). Statisk tekst under gir samme info. */}
      <p aria-hidden="true" className="num mt-3 font-serif text-4xl font-light leading-tight sm:text-6xl lg:text-7xl">
        <span ref={big}>—</span> <span className="text-2xl text-muted sm:text-3xl">{t("unit.kr")}</span>
      </p>
      <p className="sr-only">{t("ticker.sr", { annual: fmtInt(annualNok, lang), perSecond: fmtNum(c.perSecond, lang, 0) })}</p>
      <p className="num mt-4 text-lg text-muted">
        <span ref={rate}>—</span> {t("ticker.persec")}
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">{t("ticker.disclaimer")}</p>
    </section>
  );
}
