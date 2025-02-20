CREATE TABLE packages
(
    package_id      VARCHAR   NOT NULL,
    original_id     VARCHAR   NOT NULL,
    package_version bigint    NOT NULL,
    move_package    bytea     NOT NULL,
    chain_id        VARCHAR   NOT NULL,
    tx_hash         VARCHAR   NOT NULL,
    sender          VARCHAR   NOT NULL,
    timestamp       TIMESTAMP NOT NULL,
    CONSTRAINT packages_pkey PRIMARY KEY (package_id, original_id, package_version),
    CONSTRAINT packages_unique_package_id UNIQUE (package_id)
);
-- Index to optimize package filtering | Bulk resolution | Tested on Million records operations
CREATE INDEX idx_packages_original_id_version_filtering ON packages(original_id, package_version DESC);

CREATE TABLE package_dependencies
(
    package_id            VARCHAR NOT NULL REFERENCES packages (package_id),
    dependency_package_id VARCHAR NOT NULL REFERENCES packages (package_id),
    CONSTRAINT package_dependencies_pkey PRIMARY KEY (package_id, dependency_package_id)
);


CREATE TABLE name_records
(
    name       VARCHAR NOT NULL PRIMARY KEY,
    mainnet_id VARCHAR,
    testnet_id VARCHAR,
    metadata   JSONB   NOT NULL
);

CREATE INDEX idx_name_records_mainnet_id ON name_records (mainnet_id);
CREATE INDEX idx_name_records_testnet_id ON name_records (testnet_id);

CREATE TABLE package_infos
(
    id           VARCHAR NOT NULL PRIMARY KEY,
    package_id   VARCHAR NOT NULL,
    git_table_id VARCHAR NOT NULL,
    default_name VARCHAR,
    metadata     JSONB   NOT NULL
);

CREATE INDEX idx_package_infos_package_id ON package_infos (package_id);

CREATE TABLE git_infos
(
    table_id       VARCHAR NOT NULL,
    object_version BIGINT  NOT NULL,
    version        INTEGER NOT NULL,
    repository     VARCHAR,
    path           VARCHAR,
    tag            VARCHAR,
    PRIMARY KEY (table_id, version)
);

CREATE INDEX idx_git_infos_table_id ON git_infos (table_id);
