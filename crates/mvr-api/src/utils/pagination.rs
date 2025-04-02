use base64::{engine::general_purpose, Engine};
use serde::{Deserialize, Serialize};

use crate::errors::ApiError;

pub(crate) const DEFAULT_PAGE_LIMIT: u32 = 20;
pub(crate) const MAX_PAGE_LIMIT: u32 = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationLimit(u32);

impl Default for PaginationLimit {
    fn default() -> Self {
        Self(DEFAULT_PAGE_LIMIT)
    }
}

impl PaginationLimit {
    pub fn new(limit: Option<u32>) -> Result<Self, ApiError> {
        let limit = limit.unwrap_or(DEFAULT_PAGE_LIMIT);

        if limit > MAX_PAGE_LIMIT {
            return Err(ApiError::BadRequest(format!(
                "Limit must be less than or equal to {}",
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

pub struct Cursor;

// Provide a generic implementation for the trait
impl Cursor {
    pub fn encode<T: Serialize>(value: &T) -> String {
        // Serialize the value and then encode it in base64
        let serialized = serde_json::to_string(value).unwrap();
        general_purpose::STANDARD.encode(serialized)
    }

    pub fn decode_or_default<T: for<'de> Deserialize<'de> + Default>(
        value: &Option<String>,
    ) -> Result<T, ApiError> {
        if let Some(value) = value {
            // Decode the base64 string and then deserialize the JSON into the struct
            let decoded_bytes = general_purpose::STANDARD
                .decode(value)
                .map_err(|_| ApiError::InvalidCursor(value.to_string()))?;

            serde_json::from_slice::<T>(&decoded_bytes)
                .map_err(|_| ApiError::InvalidCursor(value.to_string()))
        } else {
            Ok(T::default())
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub next_cursor: Option<String>,
    pub limit: u32,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, next_cursor: Option<String>, limit: u32) -> Self {
        // if the result has more items than the limit, we pop the last item, as it
        // is only used to determine if there is a next page
        let mut items = items;

        if items.len() > limit as usize {
            items.pop();
        }

        Self {
            items,
            next_cursor,
            limit,
        }
    }
}

/// Paginate the results of a query, by encoding the last (functional) item as the
/// next cursor's definition.
///
/// This does not (yet and until needed) account for ASC/DESC
/// ordering (where we'd use the first item instead).
pub fn format_paginated_response<T, C: Serialize, F>(
    mut results: Vec<T>,
    limit: u32,
    encode_cursor: F,
) -> PaginatedResponse<T>
where
    F: Fn(&T) -> C, // Closure to define cursor encoding
{
    let has_next_page = results.len() > limit as usize;

    if has_next_page {
        let _ = results.pop();
    }

    let next_cursor = if has_next_page {
        results
            .get(limit as usize - 1)
            .map(|item| Cursor::encode(&encode_cursor(item)))
    } else {
        None
    };

    PaginatedResponse::new(results, next_cursor, limit)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
    struct TestCursor {
        pub id: Option<u32>,
        pub name: Option<String>,
    }

    #[test]
    fn test_encode_decode() {
        let cursor = TestCursor {
            id: Some(1),
            name: Some("test".to_string()),
        };

        let encoded = Cursor::encode(&cursor);
        let decoded = Cursor::decode_or_default::<TestCursor>(&Some(encoded)).unwrap();

        assert_eq!(decoded, cursor);
    }

    #[test]
    fn test_encode_decode_default() {
        let cursor = TestCursor::default();
        let decoded = Cursor::decode_or_default::<TestCursor>(&None).unwrap();

        assert_eq!(decoded, cursor);
    }

    #[test]
    fn test_paginated_results() {
        let results = vec![
            TestCursor {
                id: Some(1),
                name: Some("test".to_string()),
            },
            TestCursor {
                id: Some(2),
                name: Some("test".to_string()),
            },
            TestCursor {
                id: Some(3),
                name: Some("test".to_string()),
            },
        ];

        let paginated = format_paginated_response(results.clone(), 3, |item| TestCursor {
            id: item.id,
            name: item.name.clone(),
        });

        assert_eq!(paginated.items.len(), 3);
        // limit is 3, and we pass exactly 3 results, so no next cursor. We always query with 1 more than the limit.
        assert!(paginated.next_cursor.is_none());

        let paginated = format_paginated_response(results.clone(), 2, |item| TestCursor {
            id: item.id,
            name: item.name.clone(),
        });

        assert_eq!(paginated.items.len(), 2);
        assert!(paginated.next_cursor.is_some());
        assert_eq!(paginated.items[0], results[0]);
        assert_eq!(paginated.items[1], results[1]);
        assert_eq!(paginated.next_cursor, Some(Cursor::encode(&results[1])));

        let paginated = format_paginated_response::<TestCursor, _, _>(vec![], 25, |_| TestCursor {
            id: None,
            name: None,
        });

        assert_eq!(paginated.items.len(), 0);
        assert!(paginated.next_cursor.is_none());
    }
}
