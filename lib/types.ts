export type DataMode = "mock" | "partial" | "live";
export type Basis = "vedtatt" | "regnskap" | "estimat";

export interface Source { id: string; name: string; url: string; publisher: string; access: string; retrieved_at: string | null; status: "live" | "failed" | "manual_needed" | "mock" }
export interface Category {
  id: string; name_nb: string; name_en: string; description_nb: string; description_en: string;
  nature: "grant" | "loan" | "mixed" | "membership"; commitment: "treaty" | "agreement" | "political";
  commitment_note_nb: string; commitment_note_en: string;
}
export interface Recipient { id: string; kind: "country" | "multilateral" | "unallocated"; name_nb: string; name_en: string; iso_n3: number | null; iso_a3: string | null; region: string | null }
export interface Flow { year: number; recipient_id: string; category_id: string; amount_mnok: number; basis: Basis; source_id: string; source_ref: string; verified: boolean }
export interface Project {
  id: string; year: number; recipient_id: string; category_id: string; title_nb: string; title_en: string;
  purpose_nb: string; purpose_en: string; grantee: string; amount_mnok: number; source_id: string; source_ref: string; verified: boolean;
}
export interface YearStat { year: number; population: number; taxpayers: number; gdp_mnok: number; cpi_index: number; source_id: string; verified: boolean }
export interface UnitCost {
  id: string; label_nb: string; label_en: string; unit_nb: string; unit_en: string; value_nok: number; low_nok: number; high_nok: number;
  price_year: number; source_id: string; source_url: string; verified: boolean;
}
export interface TaxItem {
  id: string; label_nb: string; label_en: string; revenue_mnok: number; low_mnok: number; high_mnok: number; price_year: number;
  note_nb: string; note_en: string; source_id: string; source_url: string; verified: boolean;
}
export interface Meta {
  dataMode: DataMode; generatedAt: string; currentYear: number; currency: string; unit: string; priceBasis: string;
  lastSuccessfulLiveUpdate: string | null; notice_nb: string; notice_en: string; pipelineLog?: Record<string, string>;
}
export interface Dataset {
  meta: Meta; sources: Source[]; categories: Category[]; recipients: Recipient[]; flows: Flow[]; projects: Project[];
  yearStats: YearStat[]; unitCosts: UnitCost[]; taxItems: TaxItem[];
}
export type Lang = "nb" | "en";
