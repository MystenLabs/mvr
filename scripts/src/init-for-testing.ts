import path from "path";
import { publish } from "./publish-package-info"
import { unlinkSync } from "fs";
import { getActiveNetwork, parseCorePackageObjects, publishPackage, signAndExecute, sleep } from "../utils";
import { Transaction } from "@mysten/sui/transactions";
import { PackageInfo } from "./contracts/package-info";

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
    // const dotMoveDetails = await publishDotMove(NETWORK, `${CONFIG_PATH}/${CONFIG_NAME}`);

    // now publish + register a demo pkg.
    const demoPkg = await publishDemoPkg();
    await sleep(2000);

    console.log("Creating package info object for demo package");

    const tx = new Transaction();
    const pkgInfo = new PackageInfo(tx, packageInfoDetails.packageId);
    pkgInfo
        .new(demoPkg.upgradeCap)
        .setDisplay("Demo NFT trying an even bigger label that will work fine in lines", "E0E1EC", "BDBFEC", '030F1C')
        .setGitVersioning(1, {
            gitRepository: "https://github.com/MystenLabs/dot_move",
            gitSubdirectory: "packages/demo",
            gitTag: "ml/migrate-to-plugin",
        });

    const pkgInfo2 = new PackageInfo(tx, packageInfoDetails.packageId);
    pkgInfo2
        .new(demoPkg.upgradeCap)
        .setDisplay("Pink Version of my package", "E9E0EC", "DDB1EC", '030F1C')
        .setGitVersioning(1, {
            gitRepository: "https://github.com/MystenLabs/dot_move",
            gitSubdirectory: "packages/demo",
            gitTag: "ml/migrate-to-plugin",
        });

    const pkgInfo3 = new PackageInfo(tx, packageInfoDetails.packageId);
    pkgInfo3
        .new(demoPkg.upgradeCap)
        .setDisplay("Green Version of my package", "E0ECE6", "BDECD5", '030F1C')
        .setGitVersioning(1, {
            gitRepository: "https://github.com/MystenLabs/dot_move",
            gitSubdirectory: "packages/demo",
            gitTag: "ml/migrate-to-plugin",
        });

    // TODO: Publish SuiNS (clone from `suins-contracts`), set it up,
    // then create some names for testing in localnet environment.

    // const name = registerDotMove(tx, "demo", dotMoveDetails);

    // const app = registerApp({
    //     txb: tx,
    //     name: "first@demo",
    //     constants: dotMoveDetails,
    //     dotMove: name,
    //     packageInfo: pkgInfo.info,
    // });

    // tx.transferObjects([app, name], sender(tx));
    pkgInfo.tranfer({ selfTransfer: true });
    pkgInfo2.tranfer({ selfTransfer: true });
    pkgInfo3.tranfer({ selfTransfer: true });

    const res = await signAndExecute(tx, NETWORK);
    console.dir(res.effects?.created, {depth: null});
}

setupOnLocalnet();
