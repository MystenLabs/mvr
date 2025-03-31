use std::{fs, path::PathBuf};
use yansi::Paint;

use anyhow::{bail, Context, Result};
use toml_edit::{DocumentMut, Formatted, InlineTable, Item, Table, Value};

pub const RESOLVER_PREFIX_KEY: &str = "r";
pub const MVR_RESOLVER_KEY: &str = "mvr";
pub const NETWORK_KEY: &str = "network";
pub const DEPENDENCIES_KEY: &str = "dependencies";
pub const PUBLISHED_AT_KEY: &str = "published-at";
pub const ADDRESSES_KEY: &str = "addresses";

pub struct MoveToml {
    pub path: PathBuf,
    pub doc: DocumentMut,
}

impl MoveToml {
    /// Creates a new `MoveToml` instance from a passed `Move.toml` file path.
    pub fn new(path: PathBuf) -> Result<Self> {
        let doc = read_package_toml_file(&path)?;
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

    /// Sets the network in `[r.mvr]` section of the `Move.toml` file.
    pub fn set_network(&mut self, network: String) -> Result<()> {
        self.create_r_mvr_section_if_not_exists()?;

        if self.get_network().ok().is_some_and(|n| n != network) {
            eprintln!(
                "{}",
                "Network value already exists in r.mvr section. It will be overwritten.".yellow()
            );
        }
        // SAFETY: `create_r_mvr_section_if_not_exists` ensures that the `[r.mvr]` section exists.
        let mvr_table = self.doc[RESOLVER_PREFIX_KEY][MVR_RESOLVER_KEY]
            .as_table_mut()
            .unwrap();

        mvr_table.insert(NETWORK_KEY, toml_edit::value(network.to_string()));

        Ok(())
    }

    /// Get the network from the Move.toml file (specified in `[r.mvr]` section)
    pub fn get_network(&self) -> Result<String> {
        let network = self
            .doc
            .get(RESOLVER_PREFIX_KEY)
            .and_then(|v| v.get(MVR_RESOLVER_KEY))
            .and_then(|v| v.get(NETWORK_KEY))
            .map(|v| v.as_str())
            .flatten()
            .ok_or_else(|| anyhow::anyhow!("Failed to get network from Move.toml"))?;

        Ok(network.to_string())
    }

    /// Writes the state of `MoveToml` file back to the file system (replaces the initial state).
    pub fn save_to_file(&self) -> Result<()> {
        fs::write(self.path.clone(), self.doc.to_string()).with_context(|| {
            format!(
                "Failed to write updated TOML to file: {:?}",
                self.path.display()
            )
        })?;

        Ok(())
    }

    /// Creates the `[r.mvr]` section in the Move.toml file.
    /// Calling this, you can always assume that the `[r.mvr]` section exists.
    fn create_r_mvr_section_if_not_exists(&mut self) -> Result<()> {
        if !self.doc.contains_key(RESOLVER_PREFIX_KEY) {
            self.doc[RESOLVER_PREFIX_KEY] = Item::Table(Table::new());
        }

        let r_table = self.doc[RESOLVER_PREFIX_KEY].as_table_mut().unwrap();

        r_table.set_dotted(true); // expecting to create `[r.mvr]` section only

        // if we don't have the `.mvr` portion, create it.
        if !r_table.contains_key(MVR_RESOLVER_KEY) {
            r_table.insert(MVR_RESOLVER_KEY, Item::Table(Table::new()));
        }

        Ok(())
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
