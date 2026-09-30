"use client";
import { useMemo, useState } from "react";
import CountryPanel from "@/components/CountryPanel";
import { Loading } from "@/components/Shell";
import WorldMap from "@/components/WorldMap";
import { odaCats, perRecipient, years as yrs } from "@/lib/agg";
import { useData } from "@/lib/data";
import { fmtMnok } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { catColor } from "@/lib/palette";

export default function MapPage() {
  const { ds, error, recipients } = useData();
  const { lang, t, loc } = useLang();
  const [year, setYear] = useState<number | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const y = year ?? ds?.meta.currentYear ?? 0;
  const minN = min === "" ? 0 : Number(min), maxN = max === "" ? Infinity : Number(max);
  const amounts = useMemo(() => (ds ? perRecipient(ds, { year: y, categories: cats, minMnok: minN, maxMnok: maxN }) : new Map<string, number>()), [ds, y, cats, minN, maxN]);
  if (!ds) return <Loading error={error} />;

  const matches = (r: { name_nb: string; name_en: string }) => !q || `${r.name_nb} ${r.name_en}`.toLowerCase().includes(q.toLowerCase());
  const rows = [...amounts.entries()].map(([id, v]) => ({ r: recipients.get(id)!, v })).filter((x) => x.r && matches(x.r)).sort((a, b) => b.v - a.v);
  const countries = rows.filter((x) => x.r.kind === "country");
  const others = rows.filter((x) => x.r.kind !== "country");
  const selected = sel ? recipients.get(sel) : undefined;
  const total = [...amounts.values()].reduce((a, b) => a + b, 0);
  const countryRecipients = ds.recipients.filter((r) => r.kind === "country");

  const submitSearch = () => { const hit = rows[0]; if (hit && q) setSel(hit.r.id); };

  return (
    <>
      <h1 className="font-serif text-3xl">{t("nav.map")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">{t("map.intro")}</p>

      <form className="card mt-5 grid gap-4 p-4 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); submitSearch(); }} role="search" aria-label={t("filter.aria")}>
        <label className="text-sm">{t("filter.year")}
          <select className="field mt-1 block w-full" value={y} onChange={(e) => setYear(Number(e.target.value))}>
            {yrs(ds).slice().reverse().map((yy) => <option key={yy} value={yy}>{yy}</option>)}
          </select>
        </label>
        <label className="text-sm">{t("filter.search")}
          <input className="field mt-1 block w-full" type="search" list="recipient-list" value={q} placeholder={t("filter.search.ph")}
            onChange={(e) => { setQ(e.target.value); const m = ds.recipients.find((r) => r.name_nb.toLowerCase() === e.target.value.toLowerCase() || r.name_en.toLowerCase() === e.target.value.toLowerCase()); if (m) setSel(m.id); }} />
          <datalist id="recipient-list">{ds.recipients.map((r) => <option key={r.id} value={loc(r, "name")} />)}</datalist>
        </label>
        <label className="text-sm">{t("filter.min")}
          <input className="field num mt-1 block w-full" inputMode="numeric" type="number" min={0} value={min} placeholder="0" onChange={(e) => setMin(e.target.value)} />
        </label>
        <label className="text-sm">{t("filter.max")}
          <input className="field num mt-1 block w-full" inputMode="numeric" type="number" min={0} value={max} placeholder="∞" onChange={(e) => setMax(e.target.value)} />
        </label>
        <fieldset className="md:col-span-4">
          <legend className="text-sm">{t("filter.cats")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={cats.length === 0} onClick={() => setCats([])}>{t("filter.all")}</button>
            {odaCats(ds).map((c) => (
              <button type="button" key={c.id} className="chip" aria-pressed={cats.includes(c.id)}
                onClick={() => setCats((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}>
                <span aria-hidden="true" className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: catColor(c.id) }} />{loc(c, "name")}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      <p className="mt-4 text-sm" role="status">{t("map.summary", { total: fmtMnok(total, lang), n: rows.length, year: y })}</p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div>
          <WorldMap amounts={amounts} countries={countryRecipients} selected={sel} onSelect={setSel} />
          <h2 className="mt-8 font-serif text-xl">{t("list.countries")}</h2>
          <table className="num mt-2 w-full text-left text-sm">
            <thead><tr className="text-xs text-muted"><th scope="col" className="py-1">{t("col.country")}</th><th scope="col">{t("col.region")}</th><th scope="col" className="text-right">{t("col.amount")}</th></tr></thead>
            <tbody>
              {countries.map(({ r, v }) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-1"><button className="underline-offset-2 hover:underline" aria-pressed={sel === r.id} onClick={() => setSel(r.id)}>{loc(r, "name")}</button></td>
                  <td className="text-muted">{r.region ?? "—"}</td><td className="text-right">{fmtMnok(v, lang)}</td>
                </tr>
              ))}
              {!countries.length && <tr><td colSpan={3} className="py-3 text-muted">{t("list.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
          {selected ? <CountryPanel ds={ds} r={selected} year={y} onClose={() => setSel(null)} /> : <p className="card p-5 text-sm text-muted">{t("panel.hint")}</p>}
          <section className="card p-5" aria-labelledby="oth-h">
            <h2 id="oth-h" className="font-serif text-lg">{t("list.others")}</h2>
            <p className="mt-1 text-xs text-muted">{t("list.others.note")}</p>
            <ul className="mt-2 divide-y divide-line text-sm">
              {others.map(({ r, v }) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
                  <button className="text-left underline-offset-2 hover:underline" aria-pressed={sel === r.id} onClick={() => setSel(r.id)}>{loc(r, "name")}</button>
                  <span className="num shrink-0">{fmtMnok(v, lang)}</span>
                </li>
              ))}
              {!others.length && <li className="py-2 text-muted">{t("list.empty")}</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
