import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { Constants } from "@/lib/constants";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

/// Registers an app with the given name.
/// Optionally assigns a package to the app.
export const registerApp = ({
  tx,
  name,
  mainnetPackageInfo,
  suinsObjectId,
}: {
  tx: Transaction;
  name: string;
  suinsObjectId: TransactionObjectArgument | string;
  mainnetPackageInfo?: TransactionObjectArgument | string;
}) => {
  const appCap = tx.moveCall({
    target: `${Constants.appsPackageId}::move_registry::register`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(suinsObjectId),
      tx.pure.string(name),
      tx.object.clock(),
    ],
  });

  if (mainnetPackageInfo) {
    assignMainnetPackage({
      tx,
      appCap,
      packageInfo: mainnetPackageInfo
    })
  }

  return appCap;
};

export const assignMainnetPackage = ({
  tx,
  appCap,
  packageInfo,
}: {
  tx: Transaction;
  appCap: TransactionObjectArgument | string;
  packageInfo: PackageInfo | TransactionObjectArgument | string;
}) => {

  const pkgInfoArg = (typeof packageInfo === 'object' && 'objectId' in packageInfo) ? tx.object(packageInfo.objectId) : tx.object(packageInfo);

  tx.moveCall({
    target: `${Constants.appsPackageId}::move_registry::assign_package`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      pkgInfoArg,
    ],
  });
};

/**
 * Sets the external network for the given app.
 */
export const setExternalNetwork = async ({
  tx,
  appCap,
  chainId,
  packageInfo,
}: {
  tx: Transaction;
  appCap: TransactionObjectArgument | string;
  chainId: string;
  packageInfo: PackageInfo;
}) => {
  const appInfo = tx.moveCall({
    target: `${Constants.appsPackageId}::app_info::new`,
    arguments: [
      tx.pure.option("address", packageInfo.objectId),
      tx.pure.option("address", packageInfo.packageAddress),
      tx.pure.option("address", packageInfo.upgradeCapId),
    ],
  });

  tx.moveCall({
    target: `${Constants.appsPackageId}::move_registry::set_network`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(chainId),
      appInfo,
    ],
  });
};


/**
 * Unsets the external network for the given app.
 */
export const unsetExternalNetwork = async ({
  tx,
  appCap,
  chainId,
}: {
  tx: Transaction;
  appCap: TransactionObjectArgument | string;
  chainId: string;
}) => {
  tx.moveCall({
    target: `${Constants.appsPackageId}::move_registry::unset_network`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(chainId),
    ],
  });
}
