use std::fmt::{self, Display, Formatter};

pub const MINIMUM_BUILD_SUI_VERSION: (u32, u32) = (1, 62);

pub enum EnvVariables {
    SuiBinaryPath,
}

impl Display for EnvVariables {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            EnvVariables::SuiBinaryPath => write!(f, "SUI_BINARY_PATH"),
        }
    }
}
