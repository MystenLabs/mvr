-- Package analytics table
CREATE TABLE IF NOT EXISTS package_analytics (
    call_date DATE NOT NULL,
    package_id TEXT NOT NULL,
    direct_calls BIGINT NOT NULL,
    aggregated_direct_calls BIGINT NOT NULL,
    propagated_calls BIGINT NOT NULL,
    aggregated_propagated_calls BIGINT NOT NULL,
    total_calls BIGINT NOT NULL,
    aggregated_total_calls BIGINT NOT NULL,
    CONSTRAINT package_analytics_pkey PRIMARY KEY (call_date, package_id)
);

-- Package analytics indexes
CREATE INDEX IF NOT EXISTS package_analytics_package_id_idx ON package_analytics (package_id);
-- Package dependencies indexes
CREATE INDEX IF NOT EXISTS idx_package_dependencies_package_id ON package_dependencies (package_id);
CREATE INDEX IF NOT EXISTS idx_package_dependencies_dependency_package_id ON package_dependencies (dependency_package_id);
