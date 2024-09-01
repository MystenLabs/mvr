import { Network, getClient, parseCorePackageObjects, parseCreatedObject, publishPackage, signAndExecute } from "../utils";
import path from "path";
import { writeFileSync } from "fs";
import { Transaction } from "@mysten/sui/transactions";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export type CorePackageData = {
    packageId: string;
    upgradeCap: string;
    publisher: string;
    nameRegistry: string;
    nameRegistryCap: string;
    appRegistry: string;
    financialCap: string;
    appRegistryTable: string;
    nameRegistryTable: string;
}

export const publishDotMove = async (network: Network, clientConfigPath: string) => {
    const client = getClient(network);
    const txb = new Transaction();
    publishPackage(txb, path.resolve(__dirname, '../../packages/core'), clientConfigPath);

    const res = await signAndExecute(txb, network);

    const { packageId, upgradeCap } = parseCorePackageObjects(res);
    

    const publisher = parseCreatedObject(res, '0x2::package::Publisher');
    const nameRegistry = parseCreatedObject(res, `${packageId}::name_registry::NameRegistry`);
    const nameRegistryCap = parseCreatedObject(res, `${packageId}::name_registry::NameRegistryCap`);
    const financialCap = parseCreatedObject(res, `${packageId}::name_registry::FinancialCap`);
    const appRegistry = parseCreatedObject(res, `${packageId}::app_registry::AppRegistry`);

    await delay(2000);

    const appRegistryData = await client.getObject({
        id: appRegistry,
        options: {
            showContent: true
        }
    });

    const nameRegistryData = await client.getObject({
        id: nameRegistry,
        options: {
            showContent: true
        }
    });

    const appRegistryContent = appRegistryData.data?.content as Record<string, any>;
    const nameRegistryContent = nameRegistryData.data?.content as Record<string, any>;

    const appRegistryTable = appRegistryContent.fields.registry.fields.id.id;
    const nameRegistryTable = nameRegistryContent.fields.registry.fields.id.id;

    const results = {
        packageId, upgradeCap,
        publisher, nameRegistry, nameRegistryCap, appRegistry, financialCap,
        appRegistryTable, nameRegistryTable
    }

    writeFileSync(path.resolve(__dirname + `/../published.${network}.json`), JSON.stringify(results, null, 2));

    const dotMoveGraphqlToml = `[move-registry]
package-address = "${packageId}"
registry-id = "${appRegistry}"
`;

    writeFileSync(path.resolve(__dirname + `/../graphql.${network}.config.toml`), dotMoveGraphqlToml);
    await setupBasicRegistration(results, network);
    console.log("GraphQL Config file saved at: " + path.resolve(__dirname + `/../graphql-${network}.config.toml`));

    return results;
}

export const setupBasicRegistration = async (data: CorePackageData, network: Network) => {
    const txb = new Transaction();
    txb.moveCall({
        target: `${data.packageId}::name_registry::authorize_app`,
        arguments: [
            txb.object(data.nameRegistry),
            txb.object(data.nameRegistryCap)
        ],
        typeArguments: [
            `${data.packageId}::registration::Registration`
        ]
    });

    await signAndExecute(txb, network);
}
