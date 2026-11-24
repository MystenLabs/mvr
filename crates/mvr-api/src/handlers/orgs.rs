// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::{str::FromStr, sync::Arc};

use axum::{
    extract::{Path, Query, State},
    Json,
};
use diesel::{
    prelude::QueryableByName,
    sql_types::{BigInt, Nullable, Text, VarChar},
};
use mvr_types::name_service::{Domain, DomainFormat};
use serde::{Deserialize, Serialize};

use crate::{
    data::app_state::AppState,
    errors::ApiError,
    utils::pagination::{format_paginated_response, PaginatedResponse, Pagination},
};

use super::validate_search_query;

/// The known public names: shared namespaces (see `packages/public_names`) under which
/// anyone can register a package, without owning the SuiNS name. They are not
/// organizations: their packages are unrelated to each other.
///
/// Public names are not indexed, so this list mirrors the one of the web app.
pub const PUBLIC_NAMES: [&str; 1] = ["@pkg"];

/// Whether an org (in the `@` format) is one of the known public names.
pub fn is_public_name(org: &str) -> bool {
    PUBLIC_NAMES.contains(&org)
}

/// Parses an org (`@org`, `sub@org`, `org.sui` or `sub.org.sui`, in any case), and
/// returns it in the (lowercase) `@` format, which is the one names are stored with.
pub(crate) fn parse_org(org: &str) -> Result<String, ApiError> {
    let invalid = || ApiError::BadRequest(format!("Invalid org: {}", org));

    // Org names are always lowercase.
    let domain = Domain::from_str(&org.to_ascii_lowercase()).map_err(|_| invalid())?;

    // Names in the registry are always under the `.sui` TLD (`@org` is `org.sui`).
    if domain.labels.first().map(String::as_str) != Some("sui") {
        return Err(invalid());
    }

    Ok(domain.format(DomainFormat::At))
}

/// Returns a `LIKE` pattern that matches exactly the names of an org (as returned by
/// `parse_org`), e.g. `@org/%`.
///
/// Names are stored as `{org}/{app}` (with the org in the `@` format), so matching on the
/// `{org}/` prefix is an exact match on the org: `@deep/` is not a prefix of `@deepbook/core`,
/// and `@org/` is not a prefix of `sub@org/app`.
///
/// A parsed org only consists of `[a-z0-9-]` labels, `.` and `@` (see `validate_label`),
/// so there is no `LIKE` wildcard to escape.
pub(crate) fn org_name_prefix_pattern(org: &str) -> String {
    format!("{}/%", org)
}

/// The `icon_url` of the first (by name, in byte order) of the aggregated names that
/// has a (non-empty) one.
const ICON_URL_AGGREGATE: &str = r#"(ARRAY_AGG(metadata->>'icon_url' ORDER BY name COLLATE "C")
            FILTER (WHERE COALESCE(metadata->>'icon_url', '') <> ''))[1]"#;

/// An organization (the `@org` / `sub@org` part of a name) that has at least one
/// linked name.
#[derive(Serialize, Deserialize, Debug)]
pub struct OrgResponse {
    /// The org, in the `@` format (e.g. `@deepbook`, `sub@org`).
    pub name: String,
    /// The number of linked names (packages) of the org.
    pub packages: i64,
    /// The `icon_url` of the first (by name) linked package of the org that has one,
    /// to be used as the avatar of the org. This is a user-provided (on-chain) value.
    ///
    /// Always `null` for public names: their packages are unrelated to each other, so
    /// none of them can represent the name.
    pub icon_url: Option<String>,
    /// Whether this is a public name (e.g. `@pkg`) rather than an organization:
    /// anyone can register packages under it, so they do not share a publisher.
    pub is_public_name: bool,
}

impl OrgResponse {
    fn new(name: String, packages: i64, icon_url: Option<String>) -> Self {
        let is_public_name = is_public_name(&name);

        Self {
            // A public name is not represented by one of its packages.
            icon_url: icon_url.filter(|_| !is_public_name),
            is_public_name,
            name,
            packages,
        }
    }
}

/// A row of the orgs listing. The org columns are `NULL` on the single row that is
/// returned (to carry the total) when the page is empty.
#[derive(QueryableByName)]
struct OrgListRow {
    #[diesel(sql_type = Nullable<Text>)]
    name: Option<String>,
    #[diesel(sql_type = Nullable<BigInt>)]
    packages: Option<i64>,
    #[diesel(sql_type = Nullable<Text>)]
    icon_url: Option<String>,
    /// The total number of orgs that match the search (regardless of the page).
    #[diesel(sql_type = BigInt)]
    total: i64,
}

#[derive(QueryableByName)]
struct OrgSummaryRow {
    #[diesel(sql_type = BigInt)]
    packages: i64,
    #[diesel(sql_type = Nullable<Text>)]
    icon_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OrgSearchQueryParams {
    /// Optional substring to match on the org name (case-insensitive).
    pub search: Option<String>,
    pub cursor: Option<String>,
    pub offset: Option<u32>,
    pub limit: Option<u32>,
}

pub struct Orgs;

impl Orgs {
    /// Lists the orgs that have at least one linked name (a name that has a mainnet
    /// or a testnet package info: the same rule the sitemap uses), with the largest
    /// orgs first.
    ///
    /// Public names (e.g. `@pkg`) are part of the list (they are namespaces with
    /// packages, like any other), flagged with `is_public_name`, so that clients can
    /// present them differently.
    /// The registry has no org-level metadata, so the `icon_url` of an org is
    /// borrowed from one of its packages (never for public names).
    pub async fn list(
        Query(params): Query<OrgSearchQueryParams>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<PaginatedResponse<OrgResponse>>, ApiError> {
        let search = params.search.unwrap_or_default();
        validate_search_query(&search)?;
        // Org names are always lowercase.
        let search = search.trim().to_lowercase();

        let pagination = Pagination::new(params.cursor.as_deref(), params.offset, params.limit)?;

        let mut connection = app_state.reader().connect().await?;

        // Names are stored as `{org}/{app}`, so the org is everything before the `/`.
        //
        // `strpos` is a literal substring match (no pattern to escape), and matches
        // every org for an empty search. The org name ordering uses the "C" collation,
        // so that the order is the same on every database, whatever its locale.
        //
        // The page is joined to the total, so that the total is always returned: a
        // page without orgs (e.g. an offset past the last one) is a single row of
        // `NULL` org columns.
        let query = diesel::sql_query(format!(
            r#"WITH orgs AS (
    SELECT
        split_part(name, '/', 1) AS org,
        COUNT(*) AS packages,
        {ICON_URL_AGGREGATE} AS icon_url
    FROM name_records
    WHERE mainnet_id IS NOT NULL OR testnet_id IS NOT NULL
    GROUP BY 1
), matching AS (
    SELECT * FROM orgs WHERE strpos(org, $1) > 0
), page AS (
    SELECT * FROM matching
    ORDER BY packages DESC, org COLLATE "C" ASC
    LIMIT $2 OFFSET $3
)
SELECT page.org AS name, page.packages, page.icon_url, totals.total
FROM (SELECT COUNT(*) AS total FROM matching) totals
LEFT JOIN page ON TRUE
ORDER BY page.packages DESC, page.org COLLATE "C" ASC"#
        ))
        .bind::<VarChar, _>(search)
        .bind::<BigInt, _>(pagination.limit().query_limit() as i64)
        .bind::<BigInt, _>(pagination.offset() as i64);

        let rows: Vec<OrgListRow> = connection.results(query).await?;

        // Every row carries the total, and there is always at least one row.
        let total = rows.first().map(|row| row.total);

        let results: Vec<OrgResponse> = rows
            .into_iter()
            .filter_map(|row| Some(OrgResponse::new(row.name?, row.packages?, row.icon_url)))
            .collect();

        Ok(Json(format_paginated_response(results, &pagination, total)))
    }

    /// Returns a single org (the same item as the one of the listing), by its exact
    /// name. Accepts the same formats as the `org` filter of the names endpoint
    /// (`@org`, `sub@org`, `org.sui`, `sub.org.sui`).
    ///
    /// Like the listing, only orgs with at least one linked name exist. Only the
    /// names of the org are read (not the whole table).
    pub async fn get(
        Path(org): Path<String>,
        State(app_state): State<Arc<AppState>>,
    ) -> Result<Json<OrgResponse>, ApiError> {
        let org = parse_org(&org)?;

        let mut connection = app_state.reader().connect().await?;

        let query = diesel::sql_query(format!(
            r#"SELECT COUNT(*) AS packages, {ICON_URL_AGGREGATE} AS icon_url
FROM name_records
WHERE name LIKE $1 AND (mainnet_id IS NOT NULL OR testnet_id IS NOT NULL)"#
        ))
        .bind::<VarChar, _>(org_name_prefix_pattern(&org));

        let rows: Vec<OrgSummaryRow> = connection.results(query).await?;

        match rows.into_iter().next() {
            Some(row) if row.packages > 0 => {
                Ok(Json(OrgResponse::new(org, row.packages, row.icon_url)))
            }
            _ => Err(ApiError::NotFound(format!("Org {} not found", org))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{org_name_prefix_pattern, parse_org};

    #[test]
    fn org_parsing() {
        for (input, org, pattern) in [
            ("@deepbook", "@deepbook", "@deepbook/%"),
            ("deepbook.sui", "@deepbook", "@deepbook/%"),
            ("@DeepBook", "@deepbook", "@deepbook/%"),
            ("DEEPBOOK.SUI", "@deepbook", "@deepbook/%"),
            ("sub@org", "sub@org", "sub@org/%"),
            ("sub.org.sui", "sub@org", "sub@org/%"),
            ("Sub@Org", "sub@org", "sub@org/%"),
            ("a.b@org", "a.b@org", "a.b@org/%"),
            ("@my-org", "@my-org", "@my-org/%"),
        ] {
            let parsed = parse_org(input).unwrap();
            assert_eq!(parsed, org);
            assert_eq!(org_name_prefix_pattern(&parsed), pattern);
        }

        // Includes every character that is special in a `LIKE` pattern.
        for input in [
            "",
            " ",
            "@",
            "deepbook",
            "deepbook.com",
            "@deep%",
            "@deep_book",
            "@deep\\book",
            "@deep/core",
            "@org/",
            "@org@org",
            "@-org",
            "%",
            "_",
            // Not ASCII: `K` (the Kelvin sign) is not lowercased to `k`.
            "@\u{212A}",
        ] {
            assert!(parse_org(input).is_err(), "{input}");
        }
    }
}
