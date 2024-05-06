import { TransactionBlock } from "@mysten/sui.js/transactions";
import { PackageInfo } from "./package-info";
import { Network, signAndExecute } from "../utils";

const PACKAGE_IDS = {
    mainnet: {
         packageInfoPackageId: '0x15f29668bc8a8168975f6de8da926ea398619cfff5894bb71d31a777fa7ea18e',
    },
    testnet: {
        packageInfoPackageId: '0x08ad4adcb87d72b0c1626ee1c50cd1c0a9642c703b91df49399f44880d774841',
    },
    devnet: {
        packageInfoPackageId: '',
    },
    localnet: {
        packageInfoPackageId: '',
    }
}

const UPGRADE_CAP_ID = `0x2d458a4db5c9c0593002afb6fec95f798bddcc2fcaa77e0bae5b2ff48ee84890`;

const createPackageInfo = async (upgradeCapId: string, label: string, network: Network) => {
    const txb = new TransactionBlock();
    const packageInfoBuilder = new PackageInfo(txb, PACKAGE_IDS[network].packageInfoPackageId);

    packageInfoBuilder
        .new(upgradeCapId)
        .setLabel(label)
        .setGithubVersioning(1, {
            githubRepository: "https://github.com/MystenLabs/dot_move",
            githubSubdirectory: "packages/demo",
            githubTag: "main",
        })
        .tranfer({
            selfTransfer: true
        });
    
    const res = await signAndExecute(txb, network);
    console.log(res);
}

createPackageInfo('0xb5da12447ed6881a783d82d97eca5b2a4fde3addddfdb3df6b4be6274c2369ea', 'DemoV1Testnet', 'testnet');

// const updatePackageInfo = async () => {
//     const txb = new TransactionBlock();
//     const packageInfoBuilder = new PackageInfo(txb, PACKAGE_INFO_PACKAGE_ID, EXISTING_PACKAGE_INFO);
    
//     packageInfoBuilder.setLabel("InfoTestnet");
//     const res = await signAndExecute(txb, 'testnet');
//     console.log(res);
// }
