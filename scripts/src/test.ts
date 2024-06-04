import { TransactionBlock } from "@mysten/sui.js/transactions";
import { PackageInfo } from "./sdk/package-info";
import { Network, signAndExecute } from "../utils";

const PACKAGE_IDS = {
    mainnet: {
         packageInfoPackageId: '0x9664b1e243682f6db0d103cb972da6bf95927737d50d8e333ab53c2b3ed64f28',
    },
    testnet: {
        packageInfoPackageId: '0x7d46caec25163a18b3eb0b834789c415d45075c0b3e619036d9d6fe3fe6c3aaf',
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
        .setStyle({
            backgroundColor: 'fef3ef',
            packageColor: '2F243A',
            titleColor: '2F243A'
        })
        .setGitVersioning(1, {
            githubRepository: "https://github.com/MystenLabs/dot_move",
            githubSubdirectory: "packages/package_info",
            githubTag: "releases/mainnet/v1",
        })
        .tranfer({
            selfTransfer: true
        });
    
    const res = await signAndExecute(txb, network);
    console.log(res);
}
const updatePackageInfo = async (packageInfoId: string, network: Network) => {
    const txb = new TransactionBlock();
    const packageInfoBuilder = new PackageInfo(txb, PACKAGE_IDS[network].packageInfoPackageId, packageInfoId);

    packageInfoBuilder.setGitVersioning(1, {
        githubRepository: "https://github.com/MystenLabs/dot_move",
        githubSubdirectory: "packages/package_info",
        githubTag: "ml/also-add-graphql-version",
    });

    const res = await signAndExecute(txb, network);
    console.log(res);
}

updatePackageInfo('0xb8b4d5707085ae42f8f7fa8185a1d293d353763158aef3d3f17e9873a6d4cc65', 'mainnet');

// createPackageInfo('0x5ab20b154caf69755b8f2331a868f0d24d07f05a1a30141621513acbac8d6470', 'Demo', 'mainnet');
// createPackageInfo('0x7c7effd173ddd0cc33ff19c377f480b46b5c1f2c38d694d0a3e9e7abd34bf49c', 'PackageInfo', 'mainnet');
// createPackageInfo('0xe162447ee458a1e798e9b9caa52e127b8122c140ae915384e4f10781c4244603', 'DotMove', 'mainnet');

// createPackageInfo('0x660e2b943cf23edf84ef96a9bf6dcc91478948196f8a72c629ba8f9ba7d75c4b', 'Demo', 'testnet');
// createPackageInfo('0x31c673185511790397a00db4d40d21affbea9c5bfb2eac37a91a76cc07c807b3', 'PackageInfo', 'testnet');
// createPackageInfo('0xe162447ee458a1e798e9b9caa52e127b8122c140ae915384e4f10781c4244603', 'DotMove', 'testnet');


