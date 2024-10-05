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
        write!(f, "{}", self.name)
    }
}
