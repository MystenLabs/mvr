import { TransactionBlock } from "@mysten/sui.js/transactions";
import { registerApp, registerDotMove, setExternalNetwork } from "./registration-helpers";
import constants from "../published.mainnet.json"
import { Network, sender, signAndExecute } from "../utils";

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

const setNetworkForApp = async (appCap: string, network: string, value: string) => {
    const txb = new TransactionBlock();
    setExternalNetwork(txb, appCap, network, value, constants);

    const res = await signAndExecute(txb, 'mainnet');
    console.log(res);
}

// setNetworkForApp('0x96e4f1e1dc210006cad3a8d93b4f9e7e2573df37520a1e914630d71868462e11', 'testnet', '0xe23f39539cb3c8c2cd7344af0b3a5ca50a36a03221759b7ba98dccbdc8bd9750');
// registerDotMoveName('demos');
// const DOT_MOVE_NAME_OBJ = `0x9602911d2dad1c2b333e354132f167a0fd7d76527b74a8f50db92b777612118b`;
// appRegistration('demo-nft@demos', DOT_MOVE_NAME_OBJ, '0xa4da56667d429b71eff805f0f05bb06f9d1ee4b34e02be5aa00c89e2bd6fb8f4');

// registerDotMove(t)

// registerFully();

// registerAppHandler();
