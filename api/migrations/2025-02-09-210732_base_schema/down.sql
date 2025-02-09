-- This file should undo anything in `up.sql`
DROP TABLE git_infos;
DROP TABLE package_infos;
DROP TABLE name_records;
DROP TABLE packages;

DROP INDEX idx_package_info_mainnet_id;
DROP INDEX idx_package_info_testnet_id;
