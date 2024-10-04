pub const MINIMUM_BUILD_SUI_VERSION: (u32, u32) = (1, 34);

pub enum EnvVariables {
    SuiBinaryPath,
}

impl EnvVariables {
    pub fn get_env_var(&self) -> String {
        match self {
            EnvVariables::SuiBinaryPath => "SUI_BINARY_PATH".to_string(),
        }
    }
}
