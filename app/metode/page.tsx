"use client";
import { Loading } from "@/components/Shell";
import { useData } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

const SECTIONS = ["scope", "counter", "basis", "prices", "classify", "contrib", "excluded", "whatif", "gaps"] as const;
const FILES = ["dataset.json", "flows.csv", "projects.csv", "recipients.csv", "categories.csv", "sources.csv", "year_stats.csv", "unit_costs.csv", "tax_items.csv"];

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

      <section className="mt-10" id="kilder" aria-labelledby="src-h">
        <h2 id="src-h" className="font-serif text-xl">{t("method.sources.h")}</h2>
        <p className="mt-1 text-sm text-muted">{t("method.sources.p", { date: fmtDate(ds.meta.generatedAt, lang) ?? "" })}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("col.source")}</th><th scope="col">{t("col.publisher")}</th><th scope="col">{t("col.access")}</th><th scope="col">{t("col.status")}</th><th scope="col">{t("col.retrieved")}</th></tr></thead>
            <tbody>
              {ds.sources.map((s) => (
                <tr key={s.id} className="border-t border-line align-top">
                  <td className="py-1.5 pr-2"><a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></td>
                  <td className="pr-2">{s.publisher}</td><td className="pr-2">{t(`access.${s.access}`)}</td>
                  <td className="pr-2">{t(`status.${s.status}`)}</td><td>{fmtDate(s.retrieved_at, lang) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" id="nedlasting" aria-labelledby="dl-h">
        <h2 id="dl-h" className="font-serif text-xl">{t("method.dl.h")}</h2>
        <p className="mt-1 text-sm text-muted">{t("method.dl.p")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {FILES.map((f) => <li key={f}><a className="btn" href={`/data/${f}`} download>{f}</a></li>)}
        </ul>
      </section>
    </>
  );
}
