use base64::{engine::general_purpose, Engine};
use serde::{Deserialize, Serialize};

use crate::errors::ApiError;

pub(crate) const DEFAULT_PAGE_LIMIT: u32 = 20;
pub(crate) const MAX_PAGE_LIMIT: u32 = 50;

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub struct PaginationLimit(u32);

impl Default for PaginationLimit {
    fn default() -> Self {
        Self(DEFAULT_PAGE_LIMIT)
    }
}

impl PaginationLimit {
    pub fn new(limit: Option<u32>) -> Result<Self, ApiError> {
        let limit = limit.unwrap_or(DEFAULT_PAGE_LIMIT);

        if limit == 0 || limit > MAX_PAGE_LIMIT {
            return Err(ApiError::BadRequest(format!(
                "Limit must be between 1 and {}",
                MAX_PAGE_LIMIT
            )));
        }

        Ok(Self(limit))
    }

    pub fn get(&self) -> u32 {
        self.0
    }

    /// Returns the limit + 1, as we always query with 1 more than the limit.
    /// This is used to determine if there is a next page.
    pub fn query_limit(&self) -> u32 {
        self.0 + 1
    }
}

#[derive(Serialize, Deserialize)]
struct OffsetCursor {
    offset: u32,
}

impl OffsetCursor {
    fn encode(offset: u32) -> String {
        let serialized = serde_json::to_string(&Self { offset }).unwrap();
        general_purpose::STANDARD.encode(serialized)
    }

    fn decode(value: &str) -> Result<u32, ApiError> {
        let invalid = || ApiError::InvalidCursor(value.to_string());

        let decoded_bytes = general_purpose::STANDARD
            .decode(value)
            .map_err(|_| invalid())?;

        serde_json::from_slice::<Self>(&decoded_bytes)
            .map(|cursor| cursor.offset)
            .map_err(|_| invalid())
    }
}

#[derive(Debug, Clone, Eq, PartialEq, Hash)]
pub struct Pagination {
    offset: u32,
    limit: PaginationLimit,
}

impl Pagination {
    pub fn new(
        cursor: Option<&str>,
        offset: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Self, ApiError> {
        let limit = PaginationLimit::new(limit)?;

        let offset = match (cursor, offset) {
            (Some(_), Some(_)) => {
                return Err(ApiError::BadRequest(
                    "`cursor` and `offset` cannot be used together".to_string(),
                ))
            }
            (Some(cursor), None) => OffsetCursor::decode(cursor)?,
            (None, offset) => offset.unwrap_or_default(),
        };

        Ok(Self { offset, limit })
    }

    pub fn offset(&self) -> u32 {
        self.offset
    }

    pub fn limit(&self) -> &PaginationLimit {
        &self.limit
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub next_cursor: Option<String>,
    pub limit: u32,
    pub offset: u32,
    /// Total is optional, and only returned when the count is also retrievable.
    pub total: Option<i64>,
}

pub fn format_paginated_response<T>(
    mut results: Vec<T>,
    pagination: &Pagination,
    total: Option<i64>,
) -> PaginatedResponse<T> {
    let limit = pagination.limit.get();
    let has_next_page = results.len() > limit as usize;

    results.truncate(limit as usize);

    let next_cursor = has_next_page
        .then(|| pagination.offset.checked_add(limit))
        .flatten()
        .map(OffsetCursor::encode);

    PaginatedResponse {
        data: results,
        next_cursor,
        limit,
        offset: pagination.offset,
        total,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cursor_round_trip() {
        let pagination = Pagination::new(Some(&OffsetCursor::encode(40)), None, None).unwrap();
        assert_eq!(pagination.offset(), 40);
        assert_eq!(pagination.limit().get(), DEFAULT_PAGE_LIMIT);
    }

    #[test]
    fn test_pagination_params() {
        assert_eq!(Pagination::new(None, None, None).unwrap().offset(), 0);
        assert_eq!(Pagination::new(None, Some(7), None).unwrap().offset(), 7);

        assert!(Pagination::new(Some(&OffsetCursor::encode(1)), Some(1), None).is_err());
        assert!(Pagination::new(None, None, Some(MAX_PAGE_LIMIT + 1)).is_err());
        assert!(Pagination::new(None, None, Some(0)).is_err());
        assert!(Pagination::new(None, None, Some(MAX_PAGE_LIMIT)).is_ok());

        assert!(Pagination::new(Some("not a cursor"), None, None).is_err());
        let keyset_cursor = general_purpose::STANDARD.encode(r#"{"name":"@test/first"}"#);
        assert!(Pagination::new(Some(&keyset_cursor), None, None).is_err());
    }

    #[test]
    fn test_paginated_results() {
        let results = vec![1, 2, 3];

        let page = Pagination::new(None, None, Some(3)).unwrap();
        let paginated = format_paginated_response(results.clone(), &page, None);
        // limit is 3, and we pass exactly 3 results, so no next cursor. We always query with 1 more than the limit.
        assert_eq!(paginated.data, vec![1, 2, 3]);
        assert!(paginated.next_cursor.is_none());
        assert_eq!(paginated.offset, 0);

        let page = Pagination::new(None, Some(10), Some(2)).unwrap();
        let paginated = format_paginated_response(results.clone(), &page, Some(13));
        assert_eq!(paginated.data, vec![1, 2]);
        assert_eq!(paginated.next_cursor, Some(OffsetCursor::encode(12)));
        assert_eq!(paginated.offset, 10);
        assert_eq!(paginated.total, Some(13));

        let paginated = format_paginated_response::<u32>(vec![], &page, None);
        assert!(paginated.data.is_empty());
        assert!(paginated.next_cursor.is_none());
    }
}
