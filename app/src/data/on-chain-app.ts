import { Constants } from "@/lib/constants";
import { type PackageInfoData } from "@/utils/types";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

export const METADATA_KEYS = [
  "description",
  "icon_url",
  "documentation_url",
  "homepage_url",
  "contact",
];

export const registerPublicNameApp = ({
  tx,
  name,
  publicNameObjectId,
  mainnetPackageInfo,
}: {
  tx: Transaction;
  name: string;
  publicNameObjectId: TransactionObjectArgument | string;
  mainnetPackageInfo?: TransactionObjectArgument | string;
}) => {
  // TODO: Replace with mvr name (@mvr/public-names) once I've finished the operations.
  const target = `0xbd73f4a4dd8348947e8fe942866d8d1e8b3cae25b2099743e69ddb5391acbe19`;
  const appCap = tx.moveCall({
    target: `${target}::public_names::create_app`,
    arguments: [
      tx.object(publicNameObjectId),
      tx.object(Constants.appsRegistryId),
      tx.pure.string(name),
      tx.object.clock(),
    ],
  });

  if (mainnetPackageInfo) {
    assignMainnetPackage({
      tx,
      appCap,
      packageInfo: mainnetPackageInfo,
    });
  }

  return appCap;
};

/// Registers an app with the given name.
/// Optionally assigns a package to the app.
export const registerApp = ({
  tx,
  name,
  mainnetPackageInfo,
  suinsObjectId,
  isSubname,
}: {
  tx: Transaction;
  name: string;
  suinsObjectId: TransactionObjectArgument | string;
  mainnetPackageInfo?: TransactionObjectArgument | string;
  isSubname?: boolean;
}) => {
  const appCap = tx.moveCall({
    target: isSubname
      ? `@mvr/subnames-proxy::utils::register`
      : `@mvr/core::move_registry::register`,
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
      packageInfo: mainnetPackageInfo,
    });
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
  packageInfo: PackageInfoData | TransactionObjectArgument | string;
}) => {
  const pkgInfoArg =
    typeof packageInfo === "object" && "objectId" in packageInfo
      ? tx.object(packageInfo.objectId)
      : tx.object(packageInfo);

  tx.moveCall({
    target: `@mvr/core::move_registry::assign_package`,
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
  packageInfo: PackageInfoData;
}) => {
  const appInfo = tx.moveCall({
    target: `@mvr/core::app_info::new`,
    arguments: [
      tx.pure.option("address", packageInfo.objectId),
      tx.pure.option("address", packageInfo.packageAddress),
      tx.pure.option("address", packageInfo.upgradeCapId),
    ],
  });

  tx.moveCall({
    target: `@mvr/core::move_registry::set_network`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(chainId),
      appInfo,
    ],
  });
};

export const setMetadata = async ({
  tx,
  appCap,
  key,
  value,
}: {
  tx: Transaction;
  appCap: TransactionObjectArgument | string;
  key: string;
  value: string;
}) => {
  console.log("setting metadata", key, value);
  tx.moveCall({
    target: `@mvr/core::move_registry::set_metadata`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(key),
      tx.pure.string(value),
    ],
  });
};

export const removeMetadata = async ({
  tx,
  appCap,
  key,
}: {
  tx: Transaction;
  appCap: TransactionObjectArgument | string;
  key: string;
}) => {
  tx.moveCall({
    target: `@mvr/core::move_registry::unset_metadata`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(key),
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
    target: `@mvr/core::move_registry::unset_network`,
    arguments: [
      tx.object(Constants.appsRegistryId),
      tx.object(appCap),
      tx.pure.string(chainId),
    ],
  });
};
