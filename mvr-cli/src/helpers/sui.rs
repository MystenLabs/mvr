use regex::Regex;
use std::{env, process::{Command, Output}};

use super::constants::{EnvVariables, MINIMUM_BUILD_SUI_VERSION};

const VERSION_REGEX: &str = r"(\d+)\.(\d+)\.(\d+)";

/// Check the sui binary's version and print it to the console.
/// This can be used
pub fn check_sui_version(expected_version: (u32, u32)) {
    let output = sui_command(["--version"].to_vec());

    // Check if the command was successful
    if output.status.success() {
        // Convert the stdout (standard output) bytes into a string
        let version_output = String::from_utf8_lossy(&output.stdout);
        let re = Regex::new(VERSION_REGEX).expect("Failed to get the version of the SUI binary.");

        // Search the output for the version number
        if let Some(caps) = re.captures(&version_output) {
            let major_str = caps.get(1).unwrap().as_str();
            let minor_str = caps.get(2).unwrap().as_str();

            // Extract the major and minor version numbers
            let major: u32 = major_str.parse().unwrap_or_else(|_| panic!("Major version {} of SUI Binary is not a number.",
                major_str));
            let minor: u32 = minor_str.parse().unwrap_or_else(|_| panic!("Minor version {} of SUI Binary is not a number.",
                minor_str));

            assert!(
                major >= expected_version.0 && minor >= expected_version.1,
                "{}",
                &format!(
                    "SUI version is too low. Please upgrade to at least {}.{} in order to build your code using mvr.",
                    &expected_version.0, &expected_version.1
                ),
            );

            println!("Major version: {}", major);
            println!("Minor version: {}", minor);
        } else {
            println!("Could not find version components in the output.");
        }
    } else {
        // If the command fails, handle the error
        eprintln!(
            "Failed to get version info. Stderr: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

/// Calls `{sui} move build`. Currently needed when:
/// 1. Adding a new dependency (mvr add)
/// 2. Setting the network (mvr set-network)
pub fn force_build() {
    check_sui_version(MINIMUM_BUILD_SUI_VERSION);
    sui_command(["move", "build"].to_vec());
}

fn sui_command(args: Vec<&str>) -> Output {
    let (bin, env) = get_sui_binary();
    Command::new(bin)
        .args(args)
        .output()
        .unwrap_or_else(|_| panic!("\n*** Failed to find the SUI binary. *** \nPlease make sure it is installed and available in your PATH, or supply it using {} environment variable.\n", env))
        
}

fn get_sui_binary() -> (String, String) {
    let env = EnvVariables::SuiBinaryPath.to_string();
    (env::var(env.clone()).unwrap_or("sui".to_string()), env)
}