import { TransactionDataBuilder } from "@mysten/sui/transactions";

export type NameResolutionRequest = {
    id: number;
    type: 'package' | 'moveType';
    name: string;
}

/**
 * Looks up all `.move` names in a serialized transaction block.
 * Returns a list of all the names found.
 */
export const findTransactionBlockNames = (builder: TransactionDataBuilder): { names: string[], types: string[] } => {
    const names: Set<string> = new Set();
    const types: Set<string> = new Set();

    for (const command of builder.commands) {
        if (!('MoveCall' in command)) continue;
        const tx = command.MoveCall;

        if (!tx) continue;

        const pkg = tx.package.split('::')[0];
        if (pkg.includes('@')) names.add(pkg);

        for (const type of (tx.typeArguments ?? [])) {
            if (type.includes('@')) types.add(type);
        }
    }

    return {
        names: [...names],
        types: [...types]
    };
}

/**
 * Replace all names & types in a transaction block 
 * with their resolved names/types.
 */
export const replaceNames = (builder: TransactionDataBuilder, results: Record<string, string>) => {
    for (const command of builder.commands) {
        const tx = command.MoveCall;
        if (!tx) continue;

        const nameParts = tx.package.split('::');
        const name = nameParts[0];

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

export const listToRequests = (names: { names: string[], types: string[] }, batchSize: number): NameResolutionRequest[][] => {
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

const deduplicate = <T>(arr: T[]): T[] => [...new Set(arr)];
const batch = <T>(arr: T[], size: number): T[][] => {
    const batches = [];
    for (let i=0; i < arr.length; i+=size) {
        batches.push(arr.slice(i, i + size));
    }
    return batches;
}
