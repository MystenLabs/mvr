use regex::Regex;
use std::{env, process::Command};

use super::constants::EnvVariables;

const VERSION_REGEX: &str = r"(\d+)\.(\d+)\.(\d+)";

/// Check the sui binary's version and print it to the console.
/// This can be used
pub fn check_sui_version(expected_version: (u32, u32)) {
    let env = EnvVariables::SuiBinaryPath.to_string();

    let sui_bin = env::var(env.clone()).unwrap_or("sui".to_string());

    let output = Command::new(sui_bin)
        .arg("--version")
        .output()
        .expect(&format!("\n*** Failed to find the SUI binary. *** \nPlease make sure it is installed and available in your PATH, or supply it using {} environment variable.\n", env));

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
            let major: u32 = major_str.parse().expect(&format!(
                "Major version {} of SUI Binary is not a number.",
                major_str
            ));
            let minor: u32 = minor_str.parse().expect(&format!(
                "Minor version {} of SUI Binary is not a number.",
                minor_str
            ));

            assert!(
                major >= expected_version.0 && minor >= expected_version.1,
                "{}",
                &format!(
                    "SUI version is too low. Please upgrade to at least {}.{}",
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
