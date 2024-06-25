import { TransactionBlock } from "@mysten/sui.js/transactions";
import { findDotMoveNames, findTransactionBlockMoveNames, replaceTargets, replaceTypes } from "./helpers";
import { SuiGraphQLClient } from "@mysten/sui.js/graphql";
import { GraphqlQueries, recordKeyToIndex } from "./queries";
import { BuildTransactionOptions, TransactionDataBuilder } from "@mysten/sui/transactions";

export type NameMapping = {
    name: string;
    data: NameMappingData | null
}

export const resolveDotMoveNames = ({ dotMoveClient }: { dotMoveClient: DotMoveClient }) => async (
    transactionData: TransactionDataBuilder,
    _buildOptions: BuildTransactionOptions,
    next: () => Promise<void>
) => {
    const names = findTransactionBlockMoveNames(transactionData);
    // Get all the names with the respective package info objects.
    const nameMappings = await dotMoveClient.bulkResolveDotMoveApps(names) as NameMapping[];

    // deduplicate all types that need to be resolved (and fix all targets).
    const typesToResolve = [...new Set(replaceTargets(transactionData, nameMappings))];
    const resolved = await dotMoveClient.bulkResolveTypes(typesToResolve, nameMappings);

    replaceTypes(transactionData, resolved);
	await next();
}

export type NameMappingData = {
    activeNetworkPackageAddress: string;
    packageInfoObjects: string[];
    packageInfoObject: {
        package_address: string;
    };
}

export class DotMoveClient {
    #suiMainnetClient: SuiGraphQLClient<any>;
    #suiActiveClient: SuiGraphQLClient<any>;
    #appRegistryTableId: string = '0x250b60446b8e7b8d9d7251600a7228dbfda84ccb4b23a56a700d833e221fae4f';
    #packageIdV1: string = '0x1a841abe817c38221596856bc975b3b84f2f68692191e9247e185213d3d02fd8';
    #network?: 'mainnet' | 'testnet' | 'devnet';
    
    constructor({
        mainnetGraphqlEndpoint = 'https://sui-mainnet.mystenlabs.com/graphql',
        activeGraphqlEndpoint,
        network
    }: {
        mainnetGraphqlEndpoint?: string,
        activeGraphqlEndpoint: string,
        network?: 'mainnet' | 'testnet' | 'devnet'
    }) {
        // Mainnet is our source of truth for names.
        this.#suiMainnetClient = new SuiGraphQLClient({
            url:mainnetGraphqlEndpoint,
        });

        this.#suiActiveClient = new SuiGraphQLClient({
            url: activeGraphqlEndpoint,
            queries: GraphqlQueries.typed
        });
        if (network) this.#network = network;
    }

    async bulkResolveDotMoveApps(names: string[], includeInfoObjects = false) {
        if (names.length === 0) return [];
        // TODO: Determine how many of these can be resolved in a single query (limit).
        // If we are surpassing this, we need to split into multiple queries.
        const data = await this.#suiMainnetClient.query({
            query: GraphqlQueries.getRecords(names, `${this.#packageIdV1}::name::Name`, this.#appRegistryTableId),
            variables: {}
        });

        console.dir(data, { depth: null });

        const results = data.data?.owner;
        const nameMappings: Record<string, NameMappingData> = {};

        const idsToQuery: string[] = [];

        if (!results) throw new Error('No results found!');

        for (const [name, data] of Object.entries(results)) {
            const normalizedName = names[recordKeyToIndex(name)];
            if (!data?.value?.json) throw new Error(`Package "${normalizedName}" not found!`);

            const packageInfoObjects = [
                data.value.json.app_info.package_info_id,
                ...data.value.json.networks.contents.map((x: any) => x.value.package_info_id)
            ].filter(x => !!x);

            idsToQuery.push(...packageInfoObjects);

            const activeNetworkPackageAddress = this.#network === 'mainnet' ?
                                                                data.value.json.app_info.package_address : 
                                                                data.value.json.networks.contents.find((x: any) => x.key === this.#network)?.value.package_address;

            nameMappings[normalizedName] = {
                name: normalizedName,
                packageInfoObjects,
                activeNetworkPackageAddress,
                ...data.value.json
            }
        }

        // TODO: Make sure to get the "latest" version (OR the request version) for each of these resolved packages.
        // That implies that we need to call a "getLatestVersion" query for each `packageInfo` object here.
        const list = [];
        let packageInfoObjects: any[] | null = null;

        if (includeInfoObjects || !this.#network) {
            // TODO: paginate this query so we can get all the objects if our bulk request has more than 3-4 names.
            packageInfoObjects = (await this.#suiActiveClient.query({
                query: GraphqlQueries.typed.getObjects,
                variables: {
                    ids: [...new Set(idsToQuery)],
                }
            })).data?.objects.nodes.map( (x) => x.asMoveObject?.contents?.json) ?? null;
        }

        for (const [name, data] of Object.entries(nameMappings)) {
            const infoObject = packageInfoObjects?.find((object: any) => data?.packageInfoObjects.some(x => x === object?.id));

            if (packageInfoObjects && !infoObject) throw new Error(`Package "${name}" information object not found!`);

            if (infoObject) {
                data!.packageInfoObject = infoObject;
                data.activeNetworkPackageAddress = infoObject.package_address;
            }
            list.push({ name, data });
        }

        // Sort names from larger -> smaller, to make sure that our replacements cannot have an overlap
        // with other names (e.g. `nft@demos` and `demo-nft@demos`).
        list.sort((a,b) => b.name.length - a.name.length);
        return list;
    }

    async resolveDotMoveApp(name: string, includeInfoObjects?: boolean) {
        const mapping = await this.bulkResolveDotMoveApps([name], !!includeInfoObjects);
        return mapping[0];
    }

    async bulkResolveTypes(types: string[], mappings?: NameMapping[]) {
        const dotMoveNames = [... new Set(types.map(x => findDotMoveNames(x).flat()).flat())] as string[];
        const names = mappings ?? await this.bulkResolveDotMoveApps(dotMoveNames);
        const results = [...types];

        for (const name of names) {
            for(let i=0; i< types.length; i++){
                const address = name?.data?.activeNetworkPackageAddress;
                if (!address) throw new Error(`Package "${name.name}" not found!`);
                results[i] = results[i].replaceAll(name.name, address);
            }
        }

        const resolved = await this.#suiActiveClient.query({
            query: GraphqlQueries.resolveTypes(results),
            variables: {}
        });

        for(let i=0; i<results.length; i++){
            if (!resolved.data || !resolved.data[`type_${i}`]) throw new Error(`Type "${results[i]}" not found!`);
            const resolvedType = resolved.data[`type_${i}`] as any;
            results[i] = resolvedType.layout.struct.type;
        }

        return results;
    }

    async resolveType(name: string) {
        const resolved = await this.bulkResolveTypes([name]);
        return resolved[0];
    }
}
