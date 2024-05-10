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

// setNetworkForApp('0x5b3c08a98bd19b0f77d04be39b0805c35953d357fb20e4ad4837973a818edd60', 'testnet', {
//   packageAddress: '0x7d46caec25163a18b3eb0b834789c415d45075c0b3e619036d9d6fe3fe6c3aaf',
//   packageInfoId: '0x0faba75f980711387e2e8d7531160d270160abb3f33de502f06b18be432106d8'
// });
// registerDotMoveName('sample');
// const DOT_MOVE_NAME_OBJ = `0x4ae542adf2c85f436c63c66fff49302cb50c5a2ca391a2873aad8723cd85a025`;
// appRegistration('package@dotmove', DOT_MOVE_NAME_OBJ, '0xb8b4d5707085ae42f8f7fa8185a1d293d353763158aef3d3f17e9873a6d4cc65');

// registerDotMove(t)

// registerFully();

// registerAppHandler();
