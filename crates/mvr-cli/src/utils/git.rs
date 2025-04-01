use std::{path::PathBuf, process::Command};

use anyhow::{anyhow, bail, Context, Result};
use mvr_types::name::VersionedName;
use tempfile::TempDir;
use yansi::Paint;

use crate::types::api_types::SafeGitInfo;

macro_rules! clone_error {
    ($phase:expr, $name:expr, $git:expr, $stderr:expr) => {
        bail!(
            "{}: `{}`, {} {} {} {}",
            $phase.red(),
            $name.red().bold(),
            "Git error:".red(),
            $stderr.red().bold(),
            "Repository:".red(),
            $git.repository_url.red().bold(),
        );
    };
}

/// Shallow clones a git repository, into a temp directory.
/// This clone is shallow, because it does not download the entire history,
/// but only the latest commit (for mainnet), as well as the requested tag / branch.
pub(crate) fn shallow_clone_repo(
    package_name: &VersionedName,
    git_info: &SafeGitInfo,
    temp_dir: &TempDir,
) -> Result<PathBuf> {
    let name = package_name.to_string();
    if Command::new("git").arg("--version").output().is_err() {
        return Err(anyhow!(
            "Git is not available in the system PATH. Please install git and try again.".red()
        ));
    }
    let repo_dir = temp_dir.path().join(&name);

    // We clone the repo, but only with 1 level depth to avoid downloading the entire history.
    let output = Command::new("git")
        .arg("clone")
        .arg("--depth")
        .arg("1") // on the initial download, just clone the latest commit.
        .arg(&git_info.repository_url)
        .arg(&repo_dir)
        .output()
        .context("Failed to execute git clone command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        clone_error!("Failed to clone repository", &name, &git_info, &stderr);
    }

    // We try to fetch the specified SHA / tag / branch (again, with depth 1)
    let output = Command::new("git")
        .arg("-C")
        .arg(&repo_dir)
        .arg("fetch")
        .arg("--depth")
        .arg("1")
        .arg("origin")
        .arg(&git_info.tag)
        .output()
        .context(format!(
            "Failed to find the specified SHA / Tag / Branch: {} on {}",
            git_info.tag.red().bold(),
            git_info.repository_url.red().bold()
        ))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        clone_error!("Failed to fetch commit SHA", &name, &git_info, &stderr);
    }

    // We checkout to "FETCH_HEAD", which is the latest commit we've downloaded above.
    let switch_to_sha = Command::new("git")
        .arg("-C")
        .arg(&repo_dir)
        .arg("checkout")
        .arg("FETCH_HEAD")
        .output()
        .context("Failed to execute git checkout command")?;

    if !switch_to_sha.status.success() {
        let stderr = String::from_utf8_lossy(&switch_to_sha.stderr);
        clone_error!("Failed SHA checkout", &name, &git_info, &stderr);
    }

    Ok(repo_dir)
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;

    fn get_git_sha(dir: &PathBuf) -> String {
        let command = Command::new("git")
            .arg("-C")
            .arg(dir)
            .arg("rev-parse")
            .arg("HEAD")
            .output()
            .unwrap();

        assert!(command.status.success());
        String::from_utf8_lossy(&command.stdout)
            .trim()
            .to_ascii_lowercase()
    }

    fn get_git_info(tag: &str) -> SafeGitInfo {
        SafeGitInfo {
            repository_url: "https://github.com/MystenLabs/mvr.git".to_string(),
            path: "crates/mvr-cli".to_string(),
            tag: tag.to_string(),
        }
    }

    #[test]
    fn test_shallow_clone_repo_by_branch_name() {
        let temp_dir = TempDir::new().unwrap();
        let git_info = get_git_info("release");

        let versioned = VersionedName::from_str("@mvr/demo").unwrap();

        let repo_dir = shallow_clone_repo(&versioned, &git_info, &temp_dir).unwrap();
        assert!(repo_dir.exists());
    }

    #[test]
    fn test_shallow_clone_repo_by_tag_name() {
        let temp_dir = TempDir::new().unwrap();
        let git_info = get_git_info("v0.0.1");

        let versioned = VersionedName::from_str("@mvr/demo").unwrap();

        let repo_dir = shallow_clone_repo(&versioned, &git_info, &temp_dir).unwrap();

        let sha = get_git_sha(&repo_dir);
        assert_eq!(sha, "188f032f3fd39485d38a8d07966164d895a64b13");
    }

    #[test]
    fn test_shallow_clone_repo_by_commit_sha() {
        let temp_dir = TempDir::new().unwrap();
        let git_info = get_git_info("188f032f3fd39485d38a8d07966164d895a64b13");

        let versioned = VersionedName::from_str("@mvr/demo").unwrap();
        let repo_dir = shallow_clone_repo(&versioned, &git_info, &temp_dir).unwrap();

        let sha = get_git_sha(&repo_dir);
        assert_eq!(sha, "188f032f3fd39485d38a8d07966164d895a64b13");
    }
}
