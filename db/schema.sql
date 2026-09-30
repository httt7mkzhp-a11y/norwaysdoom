-- Datamodell for norwaysdoom. Samme struktur som dataset.json / CSV-filene.
-- Beløp er i millioner NOK, løpende kroner, med mindre annet er oppgitt.

CREATE TABLE source (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  url           text NOT NULL,
  publisher     text NOT NULL,
  access        text NOT NULL CHECK (access IN ('api','download','scrape','manual')),
  retrieved_at  timestamptz,                       -- NULL = aldri hentet (mock)
  status        text NOT NULL CHECK (status IN ('live','failed','manual_needed','mock'))
);

CREATE TABLE category (
  id            text PRIMARY KEY,
  name_nb       text NOT NULL,
  name_en       text NOT NULL,
  description_nb text NOT NULL,
  description_en text NOT NULL,
  nature        text NOT NULL CHECK (nature IN ('grant','loan','mixed','membership')),
  commitment    text NOT NULL CHECK (commitment IN ('treaty','agreement','political')),
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
  verified      boolean NOT NULL DEFAULT false,    -- false for mock
  PRIMARY KEY (year, recipient_id, category_id)
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
