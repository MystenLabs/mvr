use thiserror::Error;

#[derive(Debug, Error, Clone, Hash, Eq, PartialEq)]
pub enum CliError {
    #[error("There was an error querying the MVR API: {0}. You can either try again, or try installing the latest version of the CLI.")]
    Querying(String),

    #[error("Unexpected parsing error: {0}. Please try again, or install the latest version of the CLI.")]
    UnexpectedParsing(String),

    #[error("The requested package {0}, on network {1}, either does not exist, or it does not have an on-chain metadata mapping defined.")]
    NameNotExists(String, String),

    #[error("The requested network (or chain identifier) is not supported. Only `mainnet` and `testnet` are supported. 
    If you are using this locally, you can set the `MVR_FALLBACK_NETWORK` environment variable to `mainnet` or `testnet`.")]
    NetworkNotSupported,

    #[error("Invalid network: {0}. Please use `mainnet` or `testnet`.")]
    InvalidNetwork(String),

    #[error("\n*** Failed to find the SUI binary. *** \nPlease make sure it is installed and available in your PATH, or supply it using {0} environment variable.\n")]
    SuiBinaryNotFound(String),

    #[error("Missing Move.lock file for dependency {0}.")]
    MissingLockFile(String),

    #[error("Missing Move.toml file for dependency {0}.")]
    MissingTomlFile(String),
}
