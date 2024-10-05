use std::fmt;
use std::fmt::Display;
use std::fmt::Formatter;

use crate::PackageInfo;
use crate::PackageInfoNetwork;

enum CommandOutput {
    List(Vec<App>),
}

pub(crate) struct App {
    pub name: String,
    pub package_info: Vec<(PackageInfoNetwork, Option<PackageInfo>)>,
}

impl Display for App {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        writeln!(f, "\x1b[1m{}\x1b[0m", self.name)?;
        for (network, package_info) in &self.package_info {
            writeln!(f, "  [\x1b[1m{network}\x1b[0m]")?;
            if let Some(package_info) = package_info {
                writeln!(f, "    Package Info: \n{}\n", package_info)?;
            } else {
            }
            writeln!(f, "    Package Info: None")?;
        }

        Ok(())
    }
}
