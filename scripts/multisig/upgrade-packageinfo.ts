// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from "child_process";

const network = "mainnet";

// Active env of sui has to be the same with the env we're publishing to.
// if upgradeCap & gasObject is on mainnet, it has to be on mainnet.
// Github actions are always on mainnet.
const packageInfoUpgrade = async () => {
  const gasObjectId = process.env.GAS_OBJECT;

  // Enabling the gas Object check only on mainnet, to allow testnet multisig tests.
  if (!gasObjectId)
    throw new Error("No gas object supplied for a mainnet transaction");
  const packageInfoUpgradeCap =
    "0xd28751219386a463d569d008525e0ea19d72cde8b5b24d601b7f1bfac07d85dc";

  const upgradeCall = `sui client upgrade --upgrade-capability ${packageInfoUpgradeCap} --gas-budget 3000000000 --gas ${gasObjectId} --skip-dependency-verification --serialize-unsigned-transaction`;

  try {
    // Execute the command with the specified working directory and capture the output
    execSync(
      `cd $PWD/../packages/package_info && ${upgradeCall} > $PWD/../../scripts/multisig/tx-data.txt`
    );

    console.log(
      "Upgrade transaction successfully created and saved to tx-data.txt"
    );
  } catch (error: any) {
    console.error("Error during protocol upgrade:", error.message);
    console.error("stderr:", error.stderr?.toString());
    console.error("stdout:", error.stdout?.toString());
    console.error("Command:", error.cmd);
    process.exit(1); // Exit with an error code
  }
};

packageInfoUpgrade();
