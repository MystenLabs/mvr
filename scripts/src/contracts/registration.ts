import { CorePackageData } from "../publish";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

/// Registers an app with the given name.
/// Optionally assigns a package to the app.
export const registerApp = ({
  txb,
  name,
  mainnetPackageInfo,
  suinsObjectId,
  constants,
}: {
  txb: Transaction;
  name: string;
  suinsObjectId: TransactionObjectArgument | string;
  mainnetPackageInfo?: TransactionObjectArgument | string;
  constants: CorePackageData;
}) => {
  const appCap = txb.moveCall({
    target: `${constants.packageId}::move_registry::register`,
    arguments: [
      txb.object(constants.appRegistry),
      txb.object(suinsObjectId),
      txb.pure.string(name),
      txb.object.clock(),
    ],
  });

  if (mainnetPackageInfo) {
    txb.moveCall({
      target: `${constants.packageId}::move_registry::assign_package`,
      arguments: [
        txb.object(constants.appRegistry),
        appCap,
        txb.object(mainnetPackageInfo),
      ],
    });
  }

  return appCap;
};

export const setExternalNetwork = async ({
  tx,
  appCap,
  chainId,
  value,
  constants,
}: {
  tx: Transaction;
  appCap: string;
  chainId: string;
  value: { packageAddress: string; packageInfoId: string };
  constants: CorePackageData;
}) => {
  const appInfo = tx.moveCall({
    target: `${constants.packageId}::app_info::new`,
    arguments: [
      tx.pure.option("address", value.packageInfoId),
      tx.pure.option("address", value.packageAddress),
      tx.pure.option("address", null),
    ],
  });

  tx.moveCall({
    target: `${constants.packageId}::move_registry::set_network`,
    arguments: [
      tx.object(constants.appRegistry),
      tx.object(appCap),
      tx.pure.string(chainId),
      appInfo,
    ],
  });
};
