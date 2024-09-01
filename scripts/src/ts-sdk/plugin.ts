import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { BuildTransactionOptions, TransactionDataBuilder } from "@mysten/sui/transactions";

export type NameResolutionPlugin = {
    suiGraphqlClient: SuiGraphQLClient;
    pageSize?: number;
}

type NameResolutionRequest = {
    id?: number;
    type: 'package' | 'moveType';
    name: string;
}

// generate a function to deduplicate an array
const deduplicate = <T>(arr: T[]): T[] => [...new Set(arr)];

// generate a function that splits an array to batches of size N
const batch = <T>(arr: T[], size: number): T[][] => {
    const batches = [];
    for (let i=0; i < arr.length; i+=size) {
        batches.push(arr.slice(i, i + size));
    }
    return batches;
}

const listToRequests = (names: { names: string[], types: string[] }, batchSize: number): NameResolutionRequest[][] => {
    const results = [];
    const uniqueNames = deduplicate(names.names);
    const uniqueTypes = deduplicate(names.types);

    for (const [idx, name] of uniqueNames.entries()) {
        results.push({ id: idx, type: 'package', name } as NameResolutionRequest);
    }
    for (const [idx, type] of uniqueTypes.entries()) {
        results.push({ id: idx + uniqueNames.length, type: 'moveType', name: type } as NameResolutionRequest);
    }

    return batch(results, batchSize);
}

const queryGQL = async (client: SuiGraphQLClient, requests: NameResolutionRequest[]) => {
    const gqlQuery = `{
            ${requests.map(req => {
                const request = req.type === 'package' ? 'packageByName' : 'typeByName';
                const fields = req.type === 'package' ? 'address' : 'repr';

            return `key_${req.id}: ${request}(name: "${req.name}") {
                    ${fields}
                }`;
    })}}`;
    const result = await client.query({
        query: gqlQuery,
        variables: undefined
    });

    const results: Record<string, string> = {};

    for (const req of requests) {
        const key = `key_${req.id}`;
        if (!result.data || !result.data[key]) throw new Error(`No result found for key: ${req.name}`);
        const data = result.data[key] as { address?: string, repr?: string };
        
        results[req.name] = req.type === 'package' ? data.address! : data.repr!;
    }

    return results;
}

export const resolveNames = ({ suiGraphqlClient, pageSize = 10 }: NameResolutionPlugin) => async (
    transactionData: TransactionDataBuilder,
    _buildOptions: BuildTransactionOptions,
    next: () => Promise<void>
) => {
    const names = findTransactionBlockNames(transactionData);
    const batches = listToRequests(names, pageSize);
    // TODO: GQL query(ies) to resolve names & types.

    // now we need to bulk resolve all the names + types, and replace them in the transaction data.
    const results = (await Promise.all(batches.map(batch => queryGQL(suiGraphqlClient, batch)))).reduce((acc, val) => ({ ...acc, ...val }), {});

    replaceNames(transactionData, results);

    // replaceTypes(transactionData, resolved);
	await next();
}

/**
 * Looks up all `.move` names in a serialized transaction block.
 * Returns a list of all the names found.
 */
const findTransactionBlockNames = (builder: TransactionDataBuilder): { names: string[], types: string[] } => {
    const names: Set<string> = new Set();
    const types: Set<string> = new Set();

    for (const command of builder.commands) {
        if (!('MoveCall' in command)) continue;
        const tx = command.MoveCall;

        if (!tx) continue;

        const name = tx.package.split('::')[0];
        if (name.includes('@')) names.add(name);

        for (const type of (tx.typeArguments ?? [])) {
            if (type.includes('@')) types.add(type);
        }
    }

    return {
        names: [...names],
        types: [...types]
    };
}

// Replace all types in a transaction block with their resolved types.
const replaceNames = (builder: TransactionDataBuilder, results: Record<string, string>) => {
    for (const command of builder.commands) {
        const tx = command.MoveCall;
        if (!tx) continue;

        const nameParts = tx.package.split('::');
        const name = nameParts[0];

        console.log(nameParts);

        if (name.includes('@') && !results[name]) throw new Error(`No address found for package: ${name}`);

        nameParts[0] = results[name];
        tx.package = nameParts.join('::');

        const types = tx.typeArguments;
        if (!types) continue;
    
        for (let i=0; i < types.length; i++) {
            if (!types[i].includes('@')) continue;

            if (!results[types[i]]) throw new Error(`No resolution found for type: ${types[i]}`);
            types[i] = results[types[i]];
        }

        tx.typeArguments = types;
    }
}
