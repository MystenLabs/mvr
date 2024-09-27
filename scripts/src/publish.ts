import { Network, getClient, parseCorePackageObjects, parseCreatedObject, publishPackage, signAndExecute } from "../utils";
import path from "path";
import { writeFileSync } from "fs";
import { Transaction } from "@mysten/sui/transactions";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export type CorePackageData = {
    packageId: string;
    upgradeCap: string;
    publisher: string;
    appRegistry: string;
    appRegistryTable: string;
}

export const publishDotMove = async (network: Network, clientConfigPath: string) => {
    const client = getClient(network);
    const txb = new Transaction();
    publishPackage(txb, path.resolve(__dirname, '../../packages/mvr'), clientConfigPath);

    const res = await signAndExecute(txb, network);

    const { packageId, upgradeCap } = parseCorePackageObjects(res);
    

    const publisher = parseCreatedObject(res, '0x2::package::Publisher');
    const appRegistry = parseCreatedObject(res, `${packageId}::move_registry::MoveRegistry`);

    await delay(2000);

    const appRegistrydata = await client.getObject({
        id: appRegistry,
        options: {
            showContent: true
        }
    });

    const appRegistryContent = appRegistrydata.data?.content as Record<string, any>;

    const appRegistryTable = appRegistryContent.fields.registry.fields.id.id;

    const results = {
        packageId, upgradeCap,
        publisher, appRegistry,
        appRegistryTable
    }

    writeFileSync(path.resolve(__dirname + `/../published.${network}.json`), JSON.stringify(results, null, 2));

    const dotMoveGraphqlToml = `[move-registry]
package-address = "${packageId}"
registry-id = "${appRegistryTable}"
`;

    const gqlConfigName = __dirname + `/../graphql.${network}.config.toml`;
    writeFileSync(path.resolve(gqlConfigName), dotMoveGraphqlToml);
    console.log("GraphQL Config file saved at: " + path.resolve(gqlConfigName));

    return results;
}
