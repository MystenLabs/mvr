-- Enable the `pg_trgm` extension for similar name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on the name column for similar name search (SIMILAR TO 'name')
CREATE INDEX IF NOT EXISTS idx_name_similar_to ON name_records USING gin (name gin_trgm_ops);

-- Create a GIN index on the metadata->'description' column for full-text search on the description field
CREATE INDEX IF NOT EXISTS idx_metadata_desc ON name_records USING gin (to_tsvector('english', metadata->>'description'));
