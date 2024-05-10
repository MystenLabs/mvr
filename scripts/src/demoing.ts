import { TransactionBlock } from "@mysten/sui.js/transactions";
import { registerApp, registerDotMove, setExternalNetwork } from "./registration-helpers";
import constants from "../published.mainnet.json"
import { sender, signAndExecute } from "../utils";

const registerDotMoveName = async (name: string) => {
  const txb = new TransactionBlock();
  const nft = registerDotMove(txb, name, constants);
  txb.transferObjects([nft], sender(txb));

  const res = await signAndExecute(txb, 'mainnet');
  console.log(res);
}

const appRegistration = async (name: string, dotMove: string, packageInfo?: string) => {

  const txb = new TransactionBlock();

  const appCap = registerApp({
    txb, 
    name,
    dotMove,
    packageInfo,
    constants
  });

  txb.transferObjects([appCap], sender(txb));

  const res = await signAndExecute(txb, 'mainnet');
  console.log(res);
}

const setNetworkForApp = async (appCap: string, network: string, value: { packageAddress: string; packageInfoId: string }) => {
    const txb = new TransactionBlock();
    setExternalNetwork(txb, appCap, network, value, constants);

    const res = await signAndExecute(txb, 'mainnet');
    console.log(res);
}

setNetworkForApp('0x8e27ac80dd59837679cf3444f128a1602a54b02a7c4ef448cb31c6bd24bb1d2d', 'testnet', {
  packageAddress: '0x2c6aa312fbba13c0184b10a53273b58fda1e9f6119ce8a55fd2d7ea452c56bd8',
  packageInfoId: '0x7e045f7bdc3dc0b0acdab5878fe8833efbf60b889c526b67d0dc35d7293c568a'
});
// registerDotMoveName('sample');
// const DOT_MOVE_NAME_OBJ = `0xa98fca24b4f3f4d701ee602f5074375f55c1a6d59de96995036940ef82e13df3`;
// appRegistration('nft@sample', DOT_MOVE_NAME_OBJ, '0xb08fd547b47d620f19516bf8d54560c1e357f0cd5cd326f0f217943c5c8db4dd');

// registerDotMove(t)

// registerFully();

// registerAppHandler();
