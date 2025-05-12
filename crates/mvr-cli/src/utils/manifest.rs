use std::{fs, path::PathBuf, str::FromStr};
use yansi::Paint;

use anyhow::{bail, Context, Result};
use toml_edit::{DocumentMut, Formatted, InlineTable, Item, Table, TableLike, Value};

use crate::MoveRegistryDependencies;

pub const RESOLVER_PREFIX_KEY: &str = "r";
pub const MVR_RESOLVER_KEY: &str = "mvr";
pub const NETWORK_KEY: &str = "network";
pub const DEPENDENCIES_KEY: &str = "dependencies";
pub const PUBLISHED_AT_KEY: &str = "published-at";
pub const ADDRESSES_KEY: &str = "addresses";

pub struct MoveToml {
    pub path: Option<PathBuf>,
    pub doc: DocumentMut,
}

impl MoveToml {
    /// Creates a new `MoveToml` instance from a passed `Move.toml` file path.
    pub fn new(path: PathBuf) -> Result<Self> {
        let doc = read_package_toml_file(&path)?;
        Ok(Self {
            path: Some(path),
            doc,
        })
    }

    /// Creates a new `MoveToml` instance from a passed `Move.toml` file content.
    pub fn new_from_content(content: &str, path: Option<PathBuf>) -> Result<Self> {
        let doc = toml_edit::DocumentMut::from_str(content)?;
        Ok(Self { path, doc })
    }

    /// Adds a dependency to the `[dependencies]` table of the `Move.toml` file.
    pub fn add_dependency(&mut self, name: &str, mvr_name: &str) -> Result<()> {
        self.create_deps_if_not_exists()?;

        // SAFETY: `ensure_dependencies_table_exists` ensures that the `[dependencies]` table exists.
        let dependencies = self.doc[DEPENDENCIES_KEY].as_table_mut().unwrap();

        let mut new_dep_table = InlineTable::new();
        let mut r_table = InlineTable::new();
        r_table.set_dotted(true); // our `r.mvr` is a dotted table
        r_table.insert(
            MVR_RESOLVER_KEY,
            Value::String(Formatted::new(mvr_name.to_string())),
        );
        new_dep_table.insert(RESOLVER_PREFIX_KEY, Value::InlineTable(r_table));

        dependencies.insert(&name, Item::Value(Value::InlineTable(new_dep_table)));

        Ok(())
    }

    /// Get the network from the Move.toml file (specified in `[r.mvr]` section)
    pub fn get_network(&self) -> Option<String> {
        self.doc
            .get(RESOLVER_PREFIX_KEY)
            .and_then(|v| v.get(MVR_RESOLVER_KEY))
            .and_then(|v| v.get(NETWORK_KEY))
            .map(|v| v.as_str())
            .flatten()
            .map(|s| s.to_string())
    }

    /// Writes the state of `MoveToml` file back to the file system (replaces the initial state).
    pub fn save_to_file(&self) -> Result<()> {
        let Some(path) = &self.path else {
            bail!("This `MoveToml` instance is created in read-only mode.");
        };

        fs::write(path.clone(), self.doc.to_string()).with_context(|| {
            format!("Failed to write updated TOML to file: {:?}", path.display())
        })?;

        Ok(())
    }

    /// Future-proofing this for bulk-resolution by using `MoveRegistryDependencies`.
    /// Once we have bulk-external calls, we'll use this function without skipping the `package_name`
    /// argument.
    pub fn get_dependencies_by_name(&self, package_name: &str) -> Result<MoveRegistryDependencies> {
        let mut packages = Vec::new();

        let dependencies = self.get_dependencies()?;

        for (key, value) in dependencies {
            // TODO: Remove once the external resolver invokes this function only once per build.
            if key != package_name {
                continue;
            }

            let Some(val) = value.as_table_like() else {
                bail!("Dependency value is not a table");
            };

            if let Some(mvr_name) = find_mvr_package(val) {
                packages.push(mvr_name);
            }
        }

        Ok(MoveRegistryDependencies { packages })
    }

    pub fn get_dependencies(&self) -> Result<&Table> {
        self.doc
            .get(DEPENDENCIES_KEY)
            .and_then(|v| v.as_table())
            .ok_or_else(|| anyhow::anyhow!("Dependencies not set in Move.toml"))
    }

    fn create_deps_if_not_exists(&mut self) -> Result<()> {
        if !self.doc.contains_key(DEPENDENCIES_KEY) {
            self.doc[DEPENDENCIES_KEY] = Item::Table(Table::new());
        }

        Ok(())
    }
}

fn read_package_toml_file(path: &PathBuf) -> Result<DocumentMut> {
    if !path.exists() {
        bail!("Move.toml not found in the current directory".red());
    }

    let toml_content = fs::read_to_string(path.clone()).with_context(|| {
        format!(
            "{} {}",
            "Failed to read file:".red(),
            path.display().red().bold()
        )
    })?;

    let doc = toml_content
        .parse::<DocumentMut>()
        .context("Failed to parse TOML content")?;

    Ok(doc)
}

fn find_mvr_package(table: &dyn TableLike) -> Option<String> {
    table
        .get(RESOLVER_PREFIX_KEY)
        .and_then(|r| r.as_table_like())
        .and_then(|r_table| r_table.get(MVR_RESOLVER_KEY))
        .and_then(|mvr| mvr.as_str())
        .map(String::from)
}
