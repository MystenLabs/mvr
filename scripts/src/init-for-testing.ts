import path from "path";
import { publishDotMove } from "./publish";
import { publish } from "./publish-package-info"
import { unlinkSync } from "fs";
import { getActiveNetwork, Network, parseCorePackageObjects, publishPackage, sender, signAndExecute, sleep } from "../utils";
import { Transaction } from "@mysten/sui/transactions";
import { PackageInfo } from "./contracts/package-info";
import { registerApp, registerDotMove } from "./contracts/registration";

const NETWORK = getActiveNetwork();
console.log(`Using network: ${NETWORK}`);

const CONFIG_PATH = `/Users/manosliolios/.sui/sui_config`;
const CONFIG_NAME = `client.yaml`

const publishDemoPkg = async () => {
    const demoPackagePath = path.resolve(__dirname, '../../packages/demo');
    const tx = new Transaction();
    await publishPackage(tx, demoPackagePath, `${CONFIG_PATH}/${CONFIG_NAME}`);
    const res = await signAndExecute(tx, NETWORK);

    const data = await parseCorePackageObjects(res);
    return data;
}

export const setupOnLocalnet = async () => {
    const packageInfoPath = path.resolve(__dirname, '../../packages/package_info');

    // Delete the LOCK file for local runs (to safely re-publish the package info).
    try {
        unlinkSync(path.resolve(packageInfoPath + '/Move.lock'));
    }catch (e) {}
    
    // publishing package info.
    const packageInfoDetails = await publish(NETWORK, `${CONFIG_PATH}/${CONFIG_NAME}`);
    // publish dotmove package + setup.
    const dotMoveDetails = await publishDotMove(NETWORK, `${CONFIG_PATH}/${CONFIG_NAME}`);

    // now publish + register a demo pkg.
    const demoPkg = await publishDemoPkg();
    await sleep(2000);

    const tx = new Transaction();
    const pkgInfo = new PackageInfo(tx, packageInfoDetails.packageId);
    pkgInfo
        .new(demoPkg.upgradeCap)
        .setLabel("Demo NFT")
        .setStyle({
            backgroundColor: 'fef3ef',
            packageColor: '2F243A',
            titleColor: '2F243A'
        })
        .setGitVersioning(1, {
            gitRepository: "https://github.com/MystenLabs/dot_move",
            gitSubdirectory: "packages/demo",
            gitTag: "ml/migrate-to-plugin",
        });


    const name = registerDotMove(tx, "demo", dotMoveDetails);

    const app = registerApp({
        txb: tx,
        name: "first@demo",
        constants: dotMoveDetails,
        dotMove: name,
        packageInfo: pkgInfo.info,
    });

    tx.transferObjects([app, name], sender(tx));
    pkgInfo.tranfer({ selfTransfer: true });

    const res = await signAndExecute(tx, NETWORK);
    console.log(res.effects);
}

setupOnLocalnet();
