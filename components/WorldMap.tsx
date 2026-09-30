"use client";
import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { useMemo } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { bucket, BUCKETS } from "@/lib/palette";
import { useLang } from "@/lib/i18n";
import { fmtMnok } from "@/lib/format";
import type { Recipient } from "@/lib/types";

const W = 960, H = 480, NORWAY: [number, number] = [10, 62];
type F = Feature<Geometry, { name: string }> & { id?: string | number };

export default function WorldMap({ amounts, countries, selected, onSelect, maxArcs = 15 }: {
  amounts: Map<string, number>; countries: Recipient[]; selected: string | null; onSelect: (id: string) => void; maxArcs?: number;
}) {
  const { lang, t, loc } = useLang();
  const geo = useMemo(() => {
    const topo = world as unknown as Topology;
    const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const features = (fc.features as F[]).filter((f) => Number(f.id) !== 10); // uten Antarktis
    const proj = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], { type: "Sphere" });
    const path = geoPath(proj);
    return { features, proj, path };
  }, []);
  const byIso = useMemo(() => new Map(countries.filter((c) => c.iso_n3 != null).map((c) => [c.iso_n3 as number, c])), [countries]);
  const origin = geo.proj(NORWAY)!;

  const arcs = useMemo(() => {
    const out: { id: string; d: string; w: number; amount: number }[] = [];
    const entries = [...amounts.entries()].filter(([, v]) => v > 0);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    for (const f of geo.features) {
      const r = byIso.get(Number(f.id));
      const amt = r ? amounts.get(r.id) : undefined;
      if (!r || !amt || r.iso_a3 === "NOR") continue;
      const p = geo.proj(geoCentroid(f));
      if (!p) continue;
      const mx = (origin[0] + p[0]) / 2, my = (origin[1] + p[1]) / 2 - Math.hypot(p[0] - origin[0], p[1] - origin[1]) * 0.25;
      out.push({ id: r.id, d: `M${origin[0]},${origin[1]} Q${mx},${my} ${p[0]},${p[1]}`, w: 0.8 + 4.2 * Math.sqrt(amt / max), amount: amt });
    }
    return out.sort((a, b) => b.amount - a.amount).slice(0, maxArcs);
  }, [amounts, geo, byIso, origin, maxArcs]);

  const labels = [`< ${BUCKETS[0]}`, `${BUCKETS[0]}–${BUCKETS[1]}`, `${BUCKETS[1]}–${BUCKETS[2]}`, `${BUCKETS[2]}–${BUCKETS[3]}`, `${BUCKETS[3]}–${BUCKETS[4]}`, `> ${BUCKETS[4]}`];
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-lg border border-line" role="group" aria-label={t("map.aria")} style={{ background: "rgb(var(--ocean))" }}>
        <g>
          {geo.features.map((f, i) => {
            const r = byIso.get(Number(f.id));
            const amt = r ? amounts.get(r.id) ?? 0 : 0;
            const b = bucket(amt);
            const clickable = !!r && amt > 0;
            const name = r ? loc(r, "name") : f.properties?.name;
            const d = geo.path(f) ?? "";
            return (
              <path key={`${f.id}-${i}`} d={d}
                className={`country ${b >= 0 ? `r${b}` : ""} ${clickable ? "clickable" : ""} ${r && r.id === selected ? "sel" : ""}`}
                style={b < 0 ? { fill: "rgb(var(--land))" } : undefined}
                {...(clickable ? { role: "button", tabIndex: 0, "aria-label": `${name}: ${fmtMnok(amt, lang)}`, "aria-pressed": r!.id === selected,
                  onClick: () => onSelect(r!.id), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(r!.id); } } } : {})}>
                <title>{clickable ? `${name}: ${fmtMnok(amt, lang)}` : String(name)}</title>
              </path>
            );
          })}
        </g>
        <g aria-hidden="true" pointerEvents="none">
          {arcs.map((a) => <path key={a.id} d={a.d} className="arc" strokeWidth={a.w} />)}
          <circle cx={origin[0]} cy={origin[1]} r={4} fill="rgb(var(--accent2))" stroke="rgb(var(--bg))" strokeWidth={1.5} />
        </g>
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <span className="font-medium text-fg">{t("map.legend")}</span>
        <ul className="flex flex-wrap gap-3">
          {labels.map((l, i) => <li key={l} className="flex items-center gap-1"><span className={`sw${i} inline-block h-3 w-5 rounded-sm border border-line`} />{l}</li>)}
          <li className="flex items-center gap-1"><span className="inline-block h-3 w-5 rounded-sm border border-line" style={{ background: "rgb(var(--land))" }} />{t("map.nodata")}</li>
        </ul>
        <span>{t("map.arcs", { n: maxArcs })}</span>
      </figcaption>
    </figure>
  );
}
