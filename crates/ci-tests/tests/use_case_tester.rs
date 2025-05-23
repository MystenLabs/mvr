use std::{path::PathBuf, process::Command};

use anyhow::Result;
use tempfile::TempDir;

#[test]
fn run_command_tests() -> Result<()> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.extend(["tests", "cases", "commands"]);

    let commands = force_read_file(&path.join("commands.txt"));

    let commands = commands
        .split("\n")
        .filter(|line| !line.is_empty())
        .map(|line| line.trim())
        .collect::<Vec<_>>();

    let temp_project_dir = TempDir::new().unwrap();

    for command in commands {
        let cmd_output = run_command(&temp_project_dir, command)?;
        insta::assert_snapshot!(format!("cmd-{}", command.replace(" ", "_")), cmd_output);
    }

    Ok(())
}

#[test]
fn run_dependency_tests() -> Result<()> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.extend(["tests", "cases", "dependencies"]);

    let test_cases = std::fs::read_dir(path)?;

    for test_case in test_cases {
        let test_case = test_case?;

        eprintln!("Running test case {:?}", test_case.path());

        let toml = force_read_file(&test_case.path().join("initial.toml"));
        let source = force_read_file(&test_case.path().join("source.move"));
        let commands = force_read_file(&test_case.path().join("commands.txt"));

        let commands = commands
            .split("\n")
            .filter(|line| !line.is_empty())
            .map(|line| line.trim())
            .collect::<Vec<_>>();

        let project_temp_dir = create_tmp_project(&toml, &source)?;

        let mut std_output = String::new();
        for command in commands {
            std_output += &run_command(&project_temp_dir, command)?;
        }

        let output_toml = force_read_file(&project_temp_dir.path().join("Move.toml"));

        insta::assert_snapshot!(
            format!("toml-{}", test_case.file_name().to_string_lossy()),
            output_toml,
        );

        insta::assert_snapshot!(
            format!("std-output-{}", test_case.file_name().to_string_lossy()),
            std_output,
        );
    }

    Ok(())
}

fn run_command(temp_dir: &TempDir, cmd: &str) -> Result<String> {
    eprintln!("Running command {:?}", cmd);
    eprintln!("Temp dir {:?}", temp_dir.path());

    let output = Command::new("sh")
        .env("NO_COLOR", "1")
        .arg("-c")
        .arg(cmd)
        .current_dir(temp_dir.path())
        .output()
        .expect(format!("Failed to run command {}", cmd).as_str());

    let out_output = strip_ansi_escapes::strip(&output.stdout);
    let out_error = strip_ansi_escapes::strip(&output.stderr);

    if !output.status.success() {
        return Ok(String::from_utf8(out_error)?);
    }

    Ok(String::from_utf8(out_output)?)
}

fn force_read_file(path: &PathBuf) -> String {
    std::fs::read_to_string(path).expect(format!("Failed to read file {}", path.display()).as_str())
}

fn create_tmp_project(initial_toml: &str, source: &str) -> Result<TempDir> {
    let temp_dir = TempDir::new().unwrap();
    let project_dir = temp_dir.path();

    let sources_dir = project_dir.join("sources");
    let toml_path = project_dir.join("Move.toml");

    std::fs::create_dir_all(&sources_dir)?;
    std::fs::write(toml_path, initial_toml)?;
    std::fs::write(sources_dir.join("source.move"), source)?;

    Ok(temp_dir)
}
