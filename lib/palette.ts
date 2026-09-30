/** Kategoripalett (kategorisk, skal fungere i lyst og mørkt tema). Rekkefølge = dataset.categories. */
export const CAT_COLORS: Record<string, string> = {
  dev: "#2f6db5", hum: "#d9822b", ukr: "#c7364b", org: "#3f9f86", eea: "#8a63c7", def: "#7f8a99", clim: "#b09b2a",
};
export const catColor = (id: string) => CAT_COLORS[id] ?? "#888";

/** Terskler (mill. NOK) for kartets fargeklasser r1..r5; r0 brukes ikke (ingen data = land-farge). */
export const BUCKETS = [10, 100, 500, 1500, 5000];
export function bucket(mnok: number): number {
  if (mnok <= 0) return -1;
  let b = 0;
  for (const t of BUCKETS) if (mnok >= t) b++;
  return b; // 0..5
}
