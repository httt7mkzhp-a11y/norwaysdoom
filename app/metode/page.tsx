"use client";
import { Loading } from "@/components/Shell";
import { withBase } from "@/lib/base";
import { useData } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

const SECTIONS = ["scope", "counter", "basis", "prices", "classify", "contrib", "excluded", "whatif", "gaps"] as const;
const FILES = ["dataset.json", "flows.csv", "budget_lines.csv", "recipients.csv", "categories.csv", "sources.csv", "year_stats.csv", "storting/index.json"];

export default function Method() {
  const { ds, error } = useData();
  const { lang, t } = useLang();
  if (!ds) return <Loading error={error} />;
  return (
    <>
      <h1 className="font-serif text-3xl">{t("nav.method")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("method.intro")}</p>
      <div className="mt-6 max-w-3xl space-y-8">
        {SECTIONS.map((s) => (
          <section key={s} id={s} aria-labelledby={`${s}-h`}>
            <h2 id={`${s}-h`} className="font-serif text-xl">{t(`method.${s}.h`)}</h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed">{t(`method.${s}.p`).split("\n").map((p, i) => <p key={i}>{p}</p>)}</div>
          </section>
        ))}
      </div>

      <section className="mt-8 max-w-3xl" id="stortinget" aria-labelledby="st-h">
        <h2 id="st-h" className="font-serif text-xl">{t("st.method.h")}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t("st.method.p")}</p>
      </section>

      <section className="mt-10" id="kilder" aria-labelledby="src-h">
        <h2 id="src-h" className="font-serif text-xl">{t("method.sources.h")}</h2>
        <p className="mt-1 text-sm text-muted">{t("method.sources.p", { date: fmtDate(ds.meta.generatedAt, lang) ?? "" })}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("col.source")}</th><th scope="col">{t("col.publisher")}</th><th scope="col">{t("col.access")}</th><th scope="col">{t("col.license")}</th><th scope="col">{t("col.frequency")}</th><th scope="col">{t("col.status")}</th><th scope="col">{t("col.retrieved")}</th></tr></thead>
            <tbody>
              {ds.sources.map((s) => (
                <tr key={s.id} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2"><a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></td>
                  <td className="pr-2">{s.publisher}</td><td className="pr-2">{t(`access.${s.access}`)}</td>
                  <td className="pr-2">{s.license ?? "—"}</td><td className="pr-2">{s.frequency ?? "—"}</td><td className="pr-2">{t(`status.${s.status}`)}</td><td>{fmtDate(s.retrieved_at, lang) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 max-w-3xl" id="auto" aria-labelledby="auto-h">
        <h2 id="auto-h" className="font-serif text-xl">{t("method.auto.h")}</h2>
        <h3 className="mt-3 text-sm font-semibold">{t("method.auto.auto")}</h3>
        <ul className="mt-1 list-disc pl-5 text-sm">{ds.sources.filter((s) => s.automatic).map((s) => <li key={s.id}>{s.name}</li>)}</ul>
        <h3 className="mt-3 text-sm font-semibold">{t("method.manual")}</h3>
        <p className="mt-1 text-sm">{t("method.manual.list")}</p>
        <ul className="mt-1 list-disc pl-5 text-sm">{ds.sources.filter((s) => s.automatic === false).map((s) => <li key={s.id}>{s.name}</li>)}</ul>
      </section>

      <section className="mt-10 max-w-3xl" id="utilgjengelig" aria-labelledby="na-h">
        <h2 id="na-h" className="font-serif text-xl">{t("method.unavailable.h")}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(ds.meta.unavailable ?? []).map((u) => (
            <li key={u.id}><strong>{lang === "nb" ? u.area_nb : u.area_en}.</strong> {lang === "nb" ? u.reason_nb : u.reason_en}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">docs/datahull.md</p>
      </section>

      <section className="mt-10" id="nedlasting" aria-labelledby="dl-h">
        <h2 id="dl-h" className="font-serif text-xl">{t("method.dl.h")}</h2>
        <p className="mt-1 text-sm text-muted">{t("method.dl.p")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {FILES.map((f) => <li key={f}><a className="btn" href={withBase(`/data/${f}`)} download>{f}</a></li>)}
        </ul>
      </section>
    </>
  );
}
