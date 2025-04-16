// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

use crate::errors::NameServiceError;

const DEFAULT_TLD: &str = "sui";
const ACCEPTED_SEPARATORS: [char; 1] = ['.'];
const SUI_NEW_FORMAT_SEPARATOR: char = '@';

/// Two different view options for a domain.
/// `At` -> `test@example` | `Dot` -> `test.example.sui`
#[derive(Clone, Eq, PartialEq, Debug)]
pub enum DomainFormat {
    At,
    Dot,
}

#[derive(Debug, Serialize, Deserialize, Clone, Eq, Hash, PartialEq)]
pub struct Domain {
    pub labels: Vec<String>,
}

impl Domain {
    /// Formats a domain into a string based on the available output formats.
    /// The default separator is `.`
    pub fn format(&self, format: DomainFormat) -> String {
        let mut labels = self.labels.clone();
        let sep = &ACCEPTED_SEPARATORS[0].to_string();
        labels.reverse();

        if format == DomainFormat::Dot {
            return labels.join(sep);
        };

        // SAFETY: This is a safe operation because we only allow a
        // domain's label vector size to be >= 2 (see `Domain::from_str`)
        let _tld = labels.pop();
        let sld = labels.pop().unwrap();

        format!("{}{}{}", labels.join(sep), SUI_NEW_FORMAT_SEPARATOR, sld)
    }
}

impl FromStr for Domain {
    type Err = NameServiceError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        /// The maximum length of a full domain
        const MAX_DOMAIN_LENGTH: usize = 200;

        if s.len() > MAX_DOMAIN_LENGTH {
            return Err(NameServiceError::ExceedsMaxLength(
                s.len(),
                MAX_DOMAIN_LENGTH,
            ));
        }
        let separator = separator(s)?;

        let formatted_string = convert_from_new_format(s, &separator)?;

        let labels = formatted_string
            .split(separator)
            .rev()
            .map(validate_label)
            .collect::<Result<Vec<_>, Self::Err>>()?;

        // A valid domain in our system has at least a TLD and an SLD (len == 2).
        if labels.len() < 2 {
            return Err(NameServiceError::LabelsEmpty);
        }

        let labels = labels.into_iter().map(ToOwned::to_owned).collect();
        Ok(Domain { labels })
    }
}

/// Parses a separator from the domain string input.
/// E.g.  `example.sui` -> `.` | example*sui -> `@` | `example*sui` -> `*`
fn separator(s: &str) -> Result<char, NameServiceError> {
    let mut domain_separator: Option<char> = None;

    for separator in ACCEPTED_SEPARATORS.iter() {
        if s.contains(*separator) {
            if domain_separator.is_some() {
                return Err(NameServiceError::InvalidSeparator);
            }

            domain_separator = Some(*separator);
        }
    }

    match domain_separator {
        Some(separator) => Ok(separator),
        None => Ok(ACCEPTED_SEPARATORS[0]),
    }
}

/// Converts @label ending to label{separator}sui ending.
///
/// E.g. `@example` -> `example.sui` | `test@example` -> `test.example.sui`
fn convert_from_new_format(s: &str, separator: &char) -> Result<String, NameServiceError> {
    let mut splits = s.split(SUI_NEW_FORMAT_SEPARATOR);

    let Some(before) = splits.next() else {
        return Err(NameServiceError::InvalidSeparator);
    };

    let Some(after) = splits.next() else {
        return Ok(before.to_string());
    };

    if splits.next().is_some() || after.contains(*separator) || after.is_empty() {
        return Err(NameServiceError::InvalidSeparator);
    }

    let mut parts = vec![];

    if !before.is_empty() {
        parts.push(before);
    }

    parts.push(after);
    parts.push(DEFAULT_TLD);

    Ok(parts.join(&separator.to_string()))
}

pub fn validate_label(label: &str) -> Result<&str, NameServiceError> {
    const MIN_LABEL_LENGTH: usize = 1;
    const MAX_LABEL_LENGTH: usize = 63;
    let bytes = label.as_bytes();
    let len = bytes.len();

    if !(MIN_LABEL_LENGTH..=MAX_LABEL_LENGTH).contains(&len) {
        return Err(NameServiceError::InvalidLength(
            len,
            MIN_LABEL_LENGTH,
            MAX_LABEL_LENGTH,
        ));
    }

    for (i, character) in bytes.iter().enumerate() {
        let is_valid_character = match character {
            b'a'..=b'z' => true,
            b'0'..=b'9' => true,
            b'-' if i != 0 && i != len - 1 => true,
            _ => false,
        };

        if !is_valid_character {
            match character {
                b'-' => return Err(NameServiceError::InvalidHyphens),
                _ => return Err(NameServiceError::InvalidUnderscore),
            }
        };
    }
    Ok(label)
}

impl fmt::Display for Domain {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // We use to_string() to check on-chain state and parse on-chain data
        // so we should always default to DOT format.
        let output = self.format(DomainFormat::Dot);
        f.write_str(&output)?;

        Ok(())
    }
}
