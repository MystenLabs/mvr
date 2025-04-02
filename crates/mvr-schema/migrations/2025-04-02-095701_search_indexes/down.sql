-- This file should undo anything in `up.sql`

DROP INDEX IF EXISTS idx_name_similar_to;
DROP INDEX IF EXISTS idx_metadata_desc;

-- Drop the `pg_trgm` extension
DROP EXTENSION IF EXISTS pg_trgm;
