export type DataMode = "mock" | "partial" | "live";
export type Basis = "vedtatt" | "regnskap" | "estimat";

export interface Source { id: string; name: string; url: string; publisher: string; access: string; license?: string; frequency?: string; automatic?: boolean; retrieved_at: string | null; status: "live" | "failed" | "manual_needed" | "mock" }
export interface Category {
  id: string; kind?: "budget" | "oda"; name_nb: string; name_en: string; description_nb: string; description_en: string;
  nature: "grant" | "loan" | "mixed" | "membership" | "capital"; commitment: "treaty" | "agreement" | "political" | "obligatory";
  commitment_note_nb: string; commitment_note_en: string;
}
export interface Recipient { id: string; kind: "country" | "multilateral" | "unallocated"; name_nb: string; name_en: string; iso_n3: number | null; iso_a3: string | null; region: string | null }
export interface Flow {
  year: number; recipient_id: string; category_id: string; amount_mnok: number; basis: Basis; source_id: string; source_ref: string; verified: boolean;
  retrieved_at?: string; price_basis?: string; amount_usd_m?: number | null; fx_nok_per_usd?: number | null; preliminary?: boolean;
}
export interface BudgetLine {
  year: number; chapter: string; post: string; name: string; chapter_name: string; amount_nok: number; amount_mnok: number; category_id: string | null; in_scope: boolean;
  nature: Category["nature"] | null; commitment: Category["commitment"] | null; basis: Basis; price_basis: string; source_id: string; source_ref: string;
  case_ref: string; vote_id: string; vote_time: string; retrieved_at: string; verified: boolean;
}
export interface Unavailable { id: string; area_nb: string; area_en: string; reason_nb: string; reason_en: string }
export interface Project {
  id: string; year: number; recipient_id: string; category_id: string; title_nb: string; title_en: string;
  purpose_nb: string; purpose_en: string; grantee: string; amount_mnok: number; source_id: string; source_ref: string; verified: boolean;
}
export interface YearStat { year: number; population: number | null; taxpayers: number | null; gdp_mnok: number | null; cpi_index: number | null; source_id: string; source_ref?: string; retrieved_at?: string; verified: boolean }
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
  priceBaseYear?: number | null; budgetYears?: number[]; dacYears?: number[]; definitionVersion?: number; fx?: string; unavailable?: Unavailable[]; notes?: string[];
}
export interface Dataset {
  meta: Meta; sources: Source[]; categories: Category[]; recipients: Recipient[]; flows: Flow[]; budgetLines?: BudgetLine[]; projects: Project[];
  yearStats: YearStat[]; unitCosts: UnitCost[]; taxItems: TaxItem[];
}
export type Lang = "nb" | "en";
