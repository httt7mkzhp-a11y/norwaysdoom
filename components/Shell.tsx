"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useData } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";

const NAV = [
  ["/", "nav.home"], ["/kart/", "nav.map"], ["/kategorier/", "nav.categories"],
  ["/stortinget/", "nav.storting"], ["/prosjekter/", "nav.projects"], ["/hva-kunne-vi-gjort/", "nav.whatif"], ["/metode/", "nav.method"],
] as const;

function ThemeToggle() {
  const { t } = useLang();
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  return (
    <button className="btn" aria-pressed={dark} onClick={() => {
      const n = !dark; setDark(n);
      document.documentElement.dataset.theme = n ? "dark" : "light";
      try { localStorage.setItem("theme", n ? "dark" : "light"); } catch {}
    }}>{dark ? t("theme.light") : t("theme.dark")}</button>
  );
}

export function MockBanner() {
  const { ds } = useData();
  const { lang, t } = useLang();
  if (!ds || ds.meta.dataMode === "live") return null;
  return (
    <div role="note" className="border-b border-warn/40 bg-warn/10 text-warn">
      <div className="container-x py-2 text-sm">
        {lang === "nb" ? ds.meta.notice_nb : ds.meta.notice_en}{" "}
        <Link href="/metode/" className="underline">{t("banner.more")}</Link>
      </div>
    </div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { lang, setLang, t } = useLang();
  const { ds } = useData();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">{t("skip")}</a>
      <MockBanner />
      <header className="border-b border-line bg-bg/90 backdrop-blur">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-3">
          <Link href="/" className="font-serif text-lg tracking-tight">{t("site.name")}</Link>
          <nav aria-label={t("nav.aria")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(([href, key]) => (
              <Link key={href} href={href} aria-current={path === href || (href !== "/" && path?.startsWith(href)) ? "page" : undefined}
                className="py-1 text-muted hover:text-fg aria-[current=page]:border-b-2 aria-[current=page]:border-accent aria-[current=page]:text-fg">{t(key)}</Link>
            ))}
          </nav>
          <div className="flex gap-2">
            <button className="btn" onClick={() => setLang(lang === "nb" ? "en" : "nb")} aria-label={t("lang.switch")}>{lang === "nb" ? "English" : "Norsk"}</button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" className="container-x py-8">{children}</main>
      <footer className="mt-12 border-t border-line py-8 text-sm text-muted">
        <div className="container-x space-y-2">
          <p>{ds ? t("footer.updated", {
            gen: fmtDate(ds.meta.generatedAt, lang) ?? "", live: fmtDate(ds.meta.lastSuccessfulLiveUpdate, lang) ?? t("footer.never"),
          }) : ""}</p>
          <p>{t("footer.disclaimer")}</p>
          <p><Link className="underline" href="/metode/#nedlasting">{t("footer.download")}</Link> · <a className="underline" href="https://github.com/httt7mkzhp-a11y/norwaysdoom">{t("footer.source")}</a></p>
        </div>
      </footer>
    </>
  );
}

export function Loading({ error }: { error?: string | null }) {
  const { t } = useLang();
  return <p role="status" className="py-16 text-center text-muted">{error ? `${t("data.error")} (${error})` : t("data.loading")}</p>;
}

/** Liten merkelapp for uverifiserte (mock) tall. */
export function Unverified() {
  const { t } = useLang();
  return <span className="chip border-warn/50 text-warn" title={t("unverified.title")}>{t("unverified")}</span>;
}
