# Rådata (manuell import)

Legg normaliserte CSV-filer i `data/raw/<kilde>/*.csv` (f.eks. `data/raw/norad/2024.csv`). Se `docs/OPPDATERING.md`.

Kolonner (alle påkrevd, `source_ref` må være en dypllenke som starter med `http`):

```
year,recipient_id,category_id,amount_mnok,basis,source_id,source_ref
2024,tza,dev,1234.5,regnskap,norad,https://resultater.norad.no/...
```

Importerte rader erstatter mock-rader for samme (år, kategori) og får `verified=true`.
