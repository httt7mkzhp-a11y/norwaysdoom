import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DICT } from "@/lib/dict";

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe("i18n", () => {
  it("nb og en har samme nøkler", () => {
    expect(Object.keys(DICT.nb).sort()).toEqual(Object.keys(DICT.en).sort());
  });
  it("alle t('...')-nøkler i koden finnes", () => {
    const src = [...walk("app"), ...walk("components")].filter((f) => f.endsWith(".tsx")).map((f) => readFileSync(f, "utf8")).join("\n");
    const keys = new Set([...src.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]));
    const dyn = ["basis.", "nature.", "commitment.", "kind.", "access.", "status.", "method."]; // dynamiske prefiks dekkes under
    const missing = [...keys].filter((k) => !(k in DICT.nb));
    expect(missing).toEqual([]);
    for (const p of dyn) expect(Object.keys(DICT.nb).some((k) => k.startsWith(p))).toBe(true);
  });
  it("dynamiske nøkler: method.<seksjon>.h/p og enum-verdier", () => {
    for (const s of ["scope", "counter", "basis", "prices", "classify", "contrib", "excluded", "whatif", "gaps"]) { expect(DICT.nb[`method.${s}.h`]).toBeTruthy(); expect(DICT.nb[`method.${s}.p`]).toBeTruthy(); }
    for (const k of ["vedtatt", "regnskap", "estimat"]) expect(DICT.nb[`basis.${k}`]).toBeTruthy();
    for (const k of ["grant", "loan", "mixed", "membership"]) expect(DICT.nb[`nature.${k}`]).toBeTruthy();
    for (const k of ["treaty", "agreement", "political"]) expect(DICT.nb[`commitment.${k}`]).toBeTruthy();
    for (const k of ["live", "failed", "manual_needed", "mock"]) expect(DICT.nb[`status.${k}`]).toBeTruthy();
    for (const k of ["api", "download", "scrape", "manual"]) expect(DICT.nb[`access.${k}`]).toBeTruthy();
  });
});
