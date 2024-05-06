import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { CorePackageData } from "../publish";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { findDotMoveNames, findTransactionBlockMoveNames } from "./helpers";


export class DotMove {
    #suiMainnetClient: SuiClient;
    #suiActiveClient: SuiClient;
    #appRegistryTableId: string = '0x0a11ab6c88af9dd2d531ab67edda4e105bca01975d09f42c58d9772c76c63ca0';
    #packageId: string = '0x69c3603929f5fba7d3374d01d315841679285fa7ddf1d5600e8a2fa9402ac698';
    
    // This is only done through mainnet.
    constructor(client: SuiClient) {
        // Mainnet is our source of truth.
        this.#suiMainnetClient = new SuiClient({
            url: getFullnodeUrl('mainnet'),
        });

        this.#suiActiveClient = client;
    }

    async prepareTransactionBlock(txb: TransactionBlock) { 
        const serialized = JSON.parse(txb.serialize());
        // find all `.move` names in the transaction block
        const allNames = findTransactionBlockMoveNames(txb.serialize());
        // resolve all names in the transaction block.
        const nameMappings = await Promise.all(allNames.map(async (name: any) => {
            return {
                name,
                address: await this.resolveDotMoveApp(name)
            }
        }));

        // loop through the transactions and replace the names with the resolved addresses.
        for(const tx of serialized.transactions) {
            for (const mapping of nameMappings) {
                if (tx.target && tx.target.includes('@')){
                    console.log(`Replacing ${tx.target} with ${tx.target.replaceAll(mapping.name, mapping.address)}`);
                    tx.target = tx.target.replaceAll(mapping.name, mapping.address);
                }
                const types = structuredClone(tx.typeArguments);
                if (types) {
                    // TODO: Apart from this replacement, we need to resolve each individual type argument
                    // to make sure it has the correct package versions attached.
                    // Then, we need to loop again and replace the type arguments with the resolved types.
                    for(let i=0; i < types.length; i++){
                        let t = types[i];
                        if (!t.includes('@')) continue;
                        types[i] = t.replaceAll(mapping.name, mapping.address);
                        console.log(`Replacing ${t} with ${types[i]}`);
                    }
                }
                tx.typeArguments = types;
            }
        }

        return TransactionBlock.from(JSON.stringify(serialized));
    }

    async resolveDotMoveApp(name: string) {
        const result = await this.#suiMainnetClient.getDynamicFieldObject({
            parentId: this.#appRegistryTableId,
            name: {
                type: `${this.#packageId}::name::Name`,
                value: {
                    labels: name.split('@').reverse(),
                    normalized: name
                }
            }
        });

        const content = result.data?.content as Record<string, any>;
        const crossNetworkIds = content.fields.value.fields.networks.fields.contents.map( (x: any) => x.fields.value); 

        const data = {
            name: content.fields.name.fields.normalized,
            packageInfoObjects: [
                content.fields.value.fields.package_info_id, // ... map all networks too
                ...crossNetworkIds
            ]
        }

        const objects = await this.#suiActiveClient.multiGetObjects({
            ids: data.packageInfoObjects,
            options: {
                showContent: true
            }
        });

        if (!objects.some(x => !!x.data)) throw new Error(`Package "${name}" not found!`);

        const packageInfoData = objects.map((x) => x.data?.content as Record<string, any>).filter(x=> !!x);
        const packageAddress = packageInfoData[0].fields.package_address;

        // TODO: After we find the `packageAddress`, we need to call the `getLatestversion` graphQL
        // endpoint, which will give us the latest version of this package.
        return packageAddress;
    }
}
