import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { findTransactionBlockMoveNames } from "./helpers";
import { SuiClientGraphQLTransport } from "@mysten/graphql-transport";
import { SuiGraphQLClient } from "@mysten/sui.js/graphql";
import { GraphqlQueries, graphqlNameToDotMoveName } from "./queries";
import { PackageInfo } from "../package-info";

export class DotMove {
    #suiMainnetClient: SuiGraphQLClient<any>;
    #suiActiveClient: SuiGraphQLClient<any>;
    #appRegistryTableId: string = '0x0a11ab6c88af9dd2d531ab67edda4e105bca01975d09f42c58d9772c76c63ca0';
    #packageIdV1: string = '0x69c3603929f5fba7d3374d01d315841679285fa7ddf1d5600e8a2fa9402ac698';
    
    constructor({
        mainnetGraphqlEndpoint = 'https://sui-mainnet.mystenlabs.com/graphql',
        activeGraphqlEndpoint
    }: {
        mainnetGraphqlEndpoint?: string,
        activeGraphqlEndpoint: string
    }) {
        // Mainnet is our source of truth for names.
        this.#suiMainnetClient = new SuiGraphQLClient({
            url: 'https://sui-mainnet.mystenlabs.com/graphql',
        });

        this.#suiActiveClient = new SuiGraphQLClient({
            url: activeGraphqlEndpoint,
            queries: GraphqlQueries.typed
        });
    }

    async prepareTransactionBlock(txb: TransactionBlock) { 
        const serialized = JSON.parse(txb.serialize());
        // find all `.move` names in the transaction block
        const allNames = findTransactionBlockMoveNames(txb.serialize());
        // resolve all names in the transaction block.

        const nameMappings = await this.bulkResolveDotMoveApps(allNames);
        nameMappings.sort((a,b) => b.name.length - a.name.length);

        // loop through the transactions and replace the names with the resolved addresses.
        for(const tx of serialized.transactions) {
            for (const mapping of nameMappings) {
                const address = mapping.data?.packageInfoObject.package_address;

                if (tx.target && tx.target.includes('@')){
                    console.log(`Replacing ${tx.target} with ${tx.target.replaceAll(mapping.name, address)}`);
                    tx.target = tx.target.replaceAll(mapping.name, address);
                }
                const types = structuredClone(tx.typeArguments);
                if (types) {
                    // TODO: Apart from this replacement, we need to resolve each individual type argument
                    // to make sure it has the correct package versions attached.
                    // Then, we need to loop again and replace the type arguments with the resolved types.
                    for(let i=0; i < types.length; i++){
                        let t = types[i];
                        if (!t.includes('@')) continue;
                        types[i] = t.replaceAll(mapping.name, address);
                        console.log(`Replacing ${t} with ${types[i]}`);
                    }
                }
                tx.typeArguments = types;
            }
        }

        return TransactionBlock.from(JSON.stringify(serialized));
    }

    async bulkResolveDotMoveApps(names: string[]) {
        const data = await this.#suiMainnetClient.query({
            query: GraphqlQueries.getRecords(names, `${this.#packageIdV1}::name::Name`, this.#appRegistryTableId),
            variables: {}
        });

        const results = data.data?.owner;
        const nameMappings: Record<string, { name: string, packageInfoObjects: string[], packageInfoObject?: any } | null> = {};

        const idsToQuery: string[] = [];
    
        if (results) {
            for (const [name, data] of Object.entries(results)) {
                console.log({name, data});
                if (!data?.value?.json) throw new Error(`Package "${name}" not found!`);

                const packageInfoObjects = [
                    data.value.json.package_info_id, 
                    ...data.value.json.networks.contents.map((x: any) => x.value)
                ];

                idsToQuery.push(...packageInfoObjects);

                nameMappings[graphqlNameToDotMoveName(name)] = {
                    name,
                    packageInfoObjects,
                    ...data.value.json
                }
            }
        }

        // TODO: paginate this query so we can get all the objects if our bulk request
        // has more than 3-4 names.
        const packageInfoObjects = (await this.#suiActiveClient.query({
            query: GraphqlQueries.typed.getObjects,
            variables: {
                ids: [...new Set(idsToQuery)],
                limit: 10
            }
        })).data?.objects.nodes.map( (x) => x.asMoveObject?.contents?.json);

        const list = [];

        for (const [name, data] of Object.entries(nameMappings)) {
            const infoObject = packageInfoObjects?.find((object: any) => data?.packageInfoObjects.some(x => x === object?.id));

            if (!infoObject) throw new Error(`Package "${name}" information object not found!`);
            data!.packageInfoObject = infoObject;
            list.push({ name, data });
        }

        return list;
    }

    async resolveDotMoveApp(name: string) {
        const mapping = await this.bulkResolveDotMoveApps([name]);
        return mapping[0];
    }
}
