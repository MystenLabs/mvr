import * as fs from "fs";
import * as path from "path";
import {load} from 'js-toml';
import deepDiff from 'deep-diff';
import { execSync } from "child_process";

const CASES_DIR = path.join(process.cwd(), "./cases");
const DEMO_DIR = path.join(process.cwd(), "./demo-package");

function cleanUpDemoPackage() {
  if (fs.existsSync(DEMO_DIR))
    fs.rmSync(DEMO_DIR, { recursive: true, force: true });
}

function recreateDemoPackage(startTomlFilePath, sourceFilePath) {
  // delete the `demo-package` directory, and re-create it fresh.
  cleanUpDemoPackage();

  fs.mkdirSync(DEMO_DIR, { recursive: true });

  // copy the start.toml file to the `demo-package` directory.
  fs.copyFileSync(startTomlFilePath, path.join(DEMO_DIR, "Move.toml"));

  // add the source file so we can really build.
  fs.mkdirSync(path.join(DEMO_DIR, "sources"), { recursive: true });

  const sourceCode = fs.readFileSync(sourceFilePath, "utf8");
  fs.writeFileSync(path.join(DEMO_DIR, "sources", "demo.move"), sourceCode);
}

function runTestCases() {
  // go through the cases directory and find all MVR cases to deal with.
  const cases = fs
    .readdirSync(CASES_DIR)
    .filter((dir) => fs.statSync(path.join(CASES_DIR, dir)).isDirectory());

  const successful = [];

  cases.forEach((caseName) => {
    const casePath = path.join(CASES_DIR, caseName);
    // delete the `demo-package` directory, and re-create it fresh.
    recreateDemoPackage(
      path.join(casePath, "initial.toml"),
      path.join(casePath, "source.move")
    );

    // read the commands file and run each command.
    const commands = fs.readFileSync(
      path.join(casePath, "commands.txt"),
      "utf8"
    );

    commands
      .split("\n")
      .map((cmd) => cmd.trim())
      // Remove empty lines
      .filter((cmd) => cmd.length > 0)
      .forEach((command) => {
        try {
          console.log(`🔹 Executing: ${command}`);
          const output = execSync(command, {
            encoding: "utf8",
            stdio: "inherit",
            cwd: DEMO_DIR,
          });
          console.log(`✅ Command executed successfully\n`);
        } catch (error) {
          console.error(`❌ Error running command: ${command}`);
          console.error(error.message);
          // exit with a non-zero exit code to fail the test.
          process.exit(1);
        }
      });

    const output = load(fs.readFileSync(path.join(DEMO_DIR, "Move.toml"), "utf8"));
    const expected = load(fs.readFileSync(path.join(casePath, "expected.toml"), "utf8"));
    // const expectationDiff = deepDiff.deepDiff(output, expected);

    const expectationDiff = deepDiff(output, expected);

    if (expectationDiff) {
      console.error(`❌ ${caseName}: Failed`);
      console.error(expectationDiff);
      process.exit(1);
    }

    successful.push(caseName);
    console.log(`✅ ${caseName}: Passed`);
  });

  cleanUpDemoPackage();
  console.log("\n\n--------------------------------");
  console.log("SUMMARY");
  console.log("--------------------------------");
  console.log(`\n\n✅ All test cases passed.`);
  successful.map((caseName) => {
    console.log(`✅ ${caseName}: Passed`);
  });
}

runTestCases();
