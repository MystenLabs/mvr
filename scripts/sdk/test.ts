import { TransactionBlock } from "@mysten/sui.js/transactions";
import { PackageInfo } from "./dot-move";
import { signAndExecute } from "../utils";

const PACKAGE_INFO_PACKAGE_ID = `0x08ad4adcb87d72b0c1626ee1c50cd1c0a9642c703b91df49399f44880d774841`;
const PUBLISHER = `0x399caac71357f6daf2a2dc186ebee15b6e8c1ba02fba1136278e412094e0ff69`;
const UPGRADE_CAP_ID = `0x1d370d4ebca641e9adfa266741deace5ac058e6f45366b265cfe63402b114892`;

const EXISTING_PACKAGE_INFO = `0xfca3b775af4396308045e6065de9ad3047af58069a5a9ed25f7058f344fd6ef3`

const createPackageInfo = async () => {
    const txb = new TransactionBlock();
    const packageInfoBuilder = new PackageInfo(txb, PACKAGE_INFO_PACKAGE_ID);

    packageInfoBuilder
        .new(UPGRADE_CAP_ID)
        .setLabel("PackageInfo Testnet")
        .setGithubVersioning(1, {
            githubRepository: "https://github.com/MystenLabs/dot_move",
            githubSubdirectory: "packages/package_info",
            githubTag: "main",
        })
        .tranfer({
            selfTransfer: true
        });
    
    const res = await signAndExecute(txb, 'testnet');
    console.log(res);
}

createPackageInfo();
