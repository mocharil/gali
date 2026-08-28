-- Extensions required by GALI. Created at container init (needs superuser).
--   pg_trgm    : trigram similarity for fuzzy entity matching
--                (mining_license.company_name -> mining_company.name). See docs/METRICS.md §4.2.
--   btree_gin  : composite GIN indexes over scalar + jsonb columns.
--   uuid-ossp  : gen_random_uuid() is core in PG13+, but metrics.run ids are generated
--                app-side; kept for parity with managed providers.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
