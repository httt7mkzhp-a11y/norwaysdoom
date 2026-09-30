-- Datamodell for norwaysdoom. Samme struktur som dataset.json / CSV-filene.
-- Beløp er i millioner NOK, løpende kroner, med mindre annet er oppgitt.
-- Nyere felt (real datapipeline): source.license/frequency/automatic, category.kind, flow.retrieved_at/price_basis/amount_usd_m/fx_nok_per_usd, budget_line.

CREATE TABLE source (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  url           text NOT NULL,
  publisher     text NOT NULL,
  access        text NOT NULL CHECK (access IN ('api','download','scrape','manual')),
  license       text,
  frequency     text,
  automatic     boolean,
  retrieved_at  timestamptz,                       -- NULL = aldri hentet
  status        text NOT NULL CHECK (status IN ('live','failed','manual_needed','mock'))
);

CREATE TABLE category (
  id            text PRIMARY KEY,
  kind          text,                              -- budget | oda
  name_nb       text NOT NULL,
  name_en       text NOT NULL,
  description_nb text NOT NULL,
  description_en text NOT NULL,
  nature        text NOT NULL CHECK (nature IN ('grant','loan','mixed','membership','capital')),
  commitment    text NOT NULL CHECK (commitment IN ('treaty','agreement','political','obligatory')),
  commitment_note_nb text NOT NULL,
  commitment_note_en text NOT NULL
);

CREATE TABLE recipient (
  id            text PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('country','multilateral','unallocated')),
  name_nb       text NOT NULL,
  name_en       text NOT NULL,
  iso_n3        integer,                           -- ISO 3166-1 numerisk, kun land
  iso_a3        text,
  region        text
);

CREATE TABLE flow (
  year          smallint NOT NULL,
  recipient_id  text NOT NULL REFERENCES recipient(id),
  category_id   text NOT NULL REFERENCES category(id),
  amount_mnok   numeric(14,2) NOT NULL CHECK (amount_mnok >= 0),
  basis         text NOT NULL CHECK (basis IN ('vedtatt','regnskap','estimat')),
  source_id     text NOT NULL REFERENCES source(id),
  source_ref    text,                              -- dypllenke / tabell-id / rad-referanse
  verified      boolean NOT NULL DEFAULT false,
  retrieved_at  timestamptz,
  price_basis   text DEFAULT 'løpende',
  amount_usd_m  numeric(14,3),                     -- OECD-kilde i USD
  fx_nok_per_usd numeric(8,4),                     -- OECD implisitt årskurs
  PRIMARY KEY (year, recipient_id, category_id)
);

CREATE TABLE budget_line (
  year          smallint NOT NULL,
  chapter       text NOT NULL,
  post          text NOT NULL,
  name          text NOT NULL,
  chapter_name  text,
  amount_nok    bigint NOT NULL CHECK (amount_nok >= 0),
  amount_mnok   numeric(14,3) NOT NULL,
  category_id   text REFERENCES category(id),       -- NULL = utenfor avgrensningen
  in_scope      boolean NOT NULL,
  nature        text, commitment text,
  basis         text NOT NULL DEFAULT 'vedtatt',
  price_basis   text NOT NULL DEFAULT 'løpende',
  source_id     text NOT NULL REFERENCES source(id),
  source_ref    text NOT NULL,                      -- sak på stortinget.no
  case_ref      text, vote_id text, vote_time timestamptz,
  retrieved_at  timestamptz NOT NULL,
  verified      boolean NOT NULL DEFAULT true,
  PRIMARY KEY (year, chapter, post)
);

CREATE TABLE project (
  id            text PRIMARY KEY,
  year          smallint NOT NULL,
  recipient_id  text NOT NULL REFERENCES recipient(id),
  category_id   text NOT NULL REFERENCES category(id),
  title_nb      text NOT NULL,
  title_en      text NOT NULL,
  purpose_nb    text NOT NULL,
  purpose_en    text NOT NULL,
  grantee       text NOT NULL,
  amount_mnok   numeric(14,2) NOT NULL CHECK (amount_mnok >= 0),
  source_id     text NOT NULL REFERENCES source(id),
  source_ref    text,
  verified      boolean NOT NULL DEFAULT false
);

CREATE TABLE year_stat (
  year          smallint PRIMARY KEY,
  population    integer,
  taxpayers     integer,
  gdp_mnok      numeric(16,2),
  cpi_index     numeric(8,3),                      -- 2026 = 1.000, brukes til faste kroner
  source_id     text REFERENCES source(id),
  verified      boolean NOT NULL DEFAULT false
);

CREATE TABLE unit_cost (
  id            text PRIMARY KEY,
  label_nb      text NOT NULL,
  label_en      text NOT NULL,
  unit_nb       text NOT NULL,
  unit_en       text NOT NULL,
  value_nok     numeric(16,2) NOT NULL,
  low_nok       numeric(16,2) NOT NULL,
  high_nok      numeric(16,2) NOT NULL,
  price_year    smallint NOT NULL,
  source_id     text NOT NULL REFERENCES source(id),
  source_url    text NOT NULL,
  verified      boolean NOT NULL DEFAULT false
);

CREATE TABLE tax_item (
  id            text PRIMARY KEY,
  label_nb      text NOT NULL,
  label_en      text NOT NULL,
  revenue_mnok  numeric(14,2) NOT NULL,            -- proveny (inntekt staten mister ved fjerning)
  low_mnok      numeric(14,2) NOT NULL,
  high_mnok     numeric(14,2) NOT NULL,
  price_year    smallint NOT NULL,
  note_nb       text NOT NULL,
  note_en       text NOT NULL,
  source_id     text NOT NULL REFERENCES source(id),
  source_url    text NOT NULL,
  verified      boolean NOT NULL DEFAULT false
);

CREATE TABLE pipeline_run (
  id            bigserial PRIMARY KEY,
  started_at    timestamptz NOT NULL,
  finished_at   timestamptz,
  mode          text NOT NULL,
  data_mode     text NOT NULL,
  log           jsonb
);
