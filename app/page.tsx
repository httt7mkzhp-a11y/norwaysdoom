"use client";
import Link from "next/link";
import HistoryChart from "@/components/HistoryChart";
import HowWeCalculate from "@/components/HowWeCalculate";
import KeyFigures from "@/components/KeyFigures";
import { Loading } from "@/components/Shell";
import Ticker from "@/components/Ticker";
import { budgetCats, budgetTotalMnok } from "@/lib/agg";
import { useData } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export default function Home() {
  const { ds, error } = useData();
  const { lang, loc, t } = useLang();
  if (!ds) return <Loading error={error} />;
  const year = ds.meta.currentYear;
  const budgetMnok = budgetTotalMnok(ds, year);
  const annualNok = budgetMnok === null ? null : budgetMnok * 1e6;
  const cards = [
    ["/kart/", "nav.map", "home.map"], ["/kategorier/", "nav.categories", "home.categories"],
    ["/hva-kunne-vi-gjort/", "nav.whatif", "home.whatif"], ["/metode/", "nav.method", "home.method"],
  ] as const;
  return (
    <>
      {annualNok === null ? <p role="status" className="py-10 text-center text-muted">{t("ticker.na", { year })}</p> : (
        <>
          <Ticker annualNok={annualNok} year={year} />
          <KeyFigures ds={ds} annualNok={annualNok} />
          <HowWeCalculate ds={ds} annualNok={annualNok} />
        </>
      )}
      <HistoryChart ds={ds} />
      <section className="mt-8" aria-labelledby="scope-h">
        <h2 id="scope-h" className="font-serif text-xl">{t("home.scope")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t("home.scope2")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">{budgetCats(ds).map((c) => <li key={c.id} className="chip">{loc(c, "name")}</li>)}</ul>
      </section>
      <nav aria-label={lang === "nb" ? "Utforsk" : "Explore"} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([href, title, desc]) => (
          <Link key={href} href={href} className="card block p-4 hover:border-accent">
            <span className="font-serif text-lg">{t(title)}</span>
            <span className="mt-1 block text-sm text-muted">{t(desc)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
