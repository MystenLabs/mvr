import { CorePackageData } from "../publish";
import { Transaction, TransactionObjectArgument } from "@mysten/sui/transactions";

export const registerDotMove = (txb: Transaction, name: string, constants: CorePackageData) => {
  return txb.moveCall({
      target: `${constants.packageId}::registration::register`,
      arguments: [
              txb.object(constants.nameRegistry),
              txb.pure.string(name),
              txb.object.clock(),
      ],
  });
}

export const registerApp = ({
  txb, name, dotMove, packageInfo,
  constants
}: {
  txb: Transaction;
  name: string;
  dotMove: TransactionObjectArgument | string;
  packageInfo?: TransactionObjectArgument | string;
  constants: CorePackageData;
}) => {
  const appCap = txb.moveCall({
    target: `${constants.packageId}::app_registry::register`,
    arguments: [
      txb.object(constants.appRegistry),
      txb.pure.string(name),
      txb.object(dotMove),
      txb.object.clock()
    ]
  });

  if (packageInfo) {
    txb.moveCall({
      target: `${constants.packageId}::app_registry::assign_package`,
      arguments: [
        txb.object(constants.appRegistry),
        appCap,
        txb.object(packageInfo)
      ]
    });
  }

  return appCap;
}

export const setExternalNetwork = async (
  txb: Transaction, 
  appCap: string, 
  network: string, 
  value: { packageAddress: string; packageInfoId: string; }, 
  constants: CorePackageData
) => {

  const appInfo = txb.moveCall({
    target: `${constants.packageId}::app_info::new`,
    arguments: [
      txb.pure.option('address', value.packageInfoId),
      txb.pure.option('address', value.packageAddress),
      txb.pure.option('address', null)
    ]
  });

  txb.moveCall({
    target: `${constants.packageId}::app_registry::set_network`,
    arguments: [
      txb.object(constants.appRegistry),
      txb.object(appCap),
      txb.pure.string(network),
      appInfo
    ]
  })
};
