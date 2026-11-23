// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    Json,
};
use diesel::{
    prelude::QueryableByName,
    sql_types::{BigInt, Integer, Nullable, Text, VarChar},
};
use serde::{Deserialize, Serialize};

use crate::{
    data::app_state::AppState,
    errors::ApiError,
    utils::pagination::{format_paginated_response, Cursor, PaginatedResponse, PaginationLimit},
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

#[derive(QueryableByName)]
struct OrgRow {
    #[diesel(sql_type = Text)]
    name: String,
    #[diesel(sql_type = BigInt)]
    packages: i64,
    #[diesel(sql_type = Nullable<Text>)]
    icon_url: Option<String>,
    /// The total number of orgs that match the search (regardless of the cursor).
    #[diesel(sql_type = BigInt)]
    total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OrgSearchQueryParams {
    /// Optional substring to match on the org name (case-insensitive).
    pub search: Option<String>,
    pub cursor: Option<String>,
    pub limit: Option<u32>,
}

/// Orgs are ordered by `packages DESC, name ASC`, so the (keyset) cursor is the
/// `(packages, name)` pair of the last item of the page.
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct OrgCursor {
    pub packages: Option<i64>,
    pub name: Option<String>,
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

        let limit = PaginationLimit::new(params.limit)?;
        let cursor = Cursor::decode_or_default::<OrgCursor>(&params.cursor)?;
        let has_cursor = cursor.packages.is_some();

        let mut connection = app_state.reader().connect().await?;

        // Names are stored as `{org}/{app}`, so the org is everything before the `/`.
        //
        // `strpos` is a literal substring match (no pattern to escape), and matches
        // every org for an empty search. The org name ordering (and the cursor
        // comparison) use the "C" collation, so that the order is the same on every
        // database, whatever its locale.
        let query = diesel::sql_query(
            r#"WITH orgs AS (
    SELECT
        split_part(name, '/', 1) AS org,
        COUNT(*) AS packages,
        (ARRAY_AGG(metadata->>'icon_url' ORDER BY name COLLATE "C")
            FILTER (WHERE COALESCE(metadata->>'icon_url', '') <> ''))[1] AS icon_url
    FROM name_records
    WHERE mainnet_id IS NOT NULL OR testnet_id IS NOT NULL
    GROUP BY 1
), matching AS (
    SELECT * FROM orgs WHERE strpos(org, $1) > 0
)
SELECT org AS name, packages, icon_url, (SELECT COUNT(*) FROM matching) AS total
FROM matching
WHERE $2 IS NULL OR packages < $2 OR (packages = $2 AND org COLLATE "C" > $3)
ORDER BY packages DESC, org COLLATE "C" ASC
LIMIT $4"#,
        )
        .bind::<VarChar, _>(search)
        .bind::<Nullable<BigInt>, _>(cursor.packages)
        .bind::<VarChar, _>(cursor.name.unwrap_or_default())
        .bind::<Integer, _>(limit.query_limit() as i32);

        let rows: Vec<OrgRow> = connection.results(query).await?;

        // The total is carried by every row. Without rows, it is only known to be 0
        // on the first page (a cursor can point past the last item).
        let total = match rows.first() {
            Some(row) => Some(row.total),
            None if !has_cursor => Some(0),
            None => None,
        };

        let results: Vec<OrgResponse> = rows
            .into_iter()
            .map(|row| {
                let is_public_name = is_public_name(&row.name);

                OrgResponse {
                    // A public name is not represented by one of its packages.
                    icon_url: row.icon_url.filter(|_| !is_public_name),
                    is_public_name,
                    name: row.name,
                    packages: row.packages,
                }
            })
            .collect();

        Ok(Json(format_paginated_response(
            results,
            limit.get(),
            total,
            |item| OrgCursor {
                packages: Some(item.packages),
                name: Some(item.name.clone()),
            },
        )))
    }
}
