import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { namedPackagesPlugin, Transaction } from "@mysten/sui/transactions";
import { sender, signAndExecute, prepareMultisigTx } from "../utils";

Transaction.registerGlobalSerializationPlugin(
  "namedPackagesPlugin",
  namedPackagesPlugin({
    suiGraphQLClient: new SuiGraphQLClient({
      url: `https://mvr-rpc.sui-mainnet.mystenlabs.com/graphql`,
    }),
  })
);

export const run = async () => {
  const transaction = new Transaction();

  // Add `version 2` source code info to the existing `@mvr/core` package.
  const git = transaction.moveCall({
    target: `@mvr/metadata::git::new`,
    arguments: [
      transaction.pure.string("https://github.com/mystenlabs/mvr"),
      transaction.pure.string("packages/mvr"),
      transaction.pure.string("9081c38e594b70db4e1e10c1d1bd20bc34eaa937"),
    ],
  });

  transaction.moveCall({
    target: `@mvr/metadata::package_info::set_git_versioning`,
    arguments: [
      transaction.object(
        `0xb68f1155b210ef649fa86c5a1b85d419b1593e08e2ee58d400d1090d36c93543`
      ),
      transaction.pure.u64(2),
      git,
    ],
  });

  // Register `@mvr/subnames-proxy` package.
  const appCap = transaction.moveCall({
    target: `@mvr/core::move_registry::register`,
    arguments: [
      transaction.object(
        "0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727"
      ),
      transaction.object(
        "0x96cb21bd8681633154f793b7fbbb3f1ba648e75522669c3402d7e80315af9cb7"
      ),
      transaction.pure.string("subnames-proxy"),
      transaction.object.clock(),
    ],
  });

  // Assign the `PackageInfo` that has been pre-created from the burner.
  // We do not have any non-mainnet addresses.
  transaction.moveCall({
    target: `@mvr/core::move_registry::assign_package`,
    arguments: [
      transaction.object(
        "0x0e5d473a055b6b7d014af557a13ad9075157fdc19b6d51562a18511afd397727"
      ),
      appCap,
      transaction.object(
        "0x04de61f83f793aa89349263e04af8e186cffbbb4f4582422afd054a8bfb2c706"
      ),
    ],
  });

  transaction.transferObjects([appCap], sender(transaction));

  await prepareMultisigTx(transaction, "mainnet");
};

run();
