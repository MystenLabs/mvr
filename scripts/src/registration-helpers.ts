import { TransactionBlock, TransactionObjectArgument } from "@mysten/sui.js/transactions"
import { sender, signAndExecute } from "../utils";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui.js/utils";
import { CorePackageData } from "./publish";
import { bcs } from "@mysten/sui.js/bcs";

export const registerDotMove = (txb: TransactionBlock, name: string, constants: CorePackageData) => {
  return txb.moveCall({
      target: `${constants.packageId}::registration::register`,
      arguments: [
              txb.object(constants.nameRegistry),
              txb.pure.string(name),
              txb.object(SUI_CLOCK_OBJECT_ID),
      ],
  });
}

export const registerApp = ({
  txb, name, dotMove, packageInfo,
  constants
}: {
  txb: TransactionBlock;
  name: string;
  dotMove: TransactionObjectArgument;
  packageInfo?: string;
  constants: CorePackageData;
}) => {
  const appCap = txb.moveCall({
    target: `${constants.packageId}::app_registry::register`,
    arguments: [
      txb.object(constants.appRegistry),
      txb.pure.string(name),
      txb.object(dotMove),
      txb.object(SUI_CLOCK_OBJECT_ID)
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
  txb: TransactionBlock, 
  appCap: string, 
  network: string, 
  value: { packageAddress: string; packageInfoId: string; }, 
  constants: CorePackageData
) => {

  const appInfo = txb.moveCall({
    target: `${constants.packageId}::app_info::new`,
    arguments: [
      txb.pure(bcs.option(bcs.Address).serialize(value.packageInfoId).toBytes()),
      txb.pure(bcs.option(bcs.Address).serialize(value.packageAddress).toBytes()),
      txb.pure(bcs.option(bcs.Address).serialize(null).toBytes())
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
