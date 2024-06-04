import { TransactionDataBuilder } from "@mysten/sui/transactions";
import { NameMapping } from "./dot-move";

export const findDotMoveNames = (type: string): string[] => {
    const names: Set<string> = new Set();
    const partials = type.split('<').map(x => x.split("::")[0]);

    for(const part of partials) {
        if (part.includes('@')) names.add(part);
    }

    return [...names];
}

/**
 * Looks up all `.move` names in a serialized transaction block.
 * Returns a list of all the names found.
 */
export const findTransactionBlockMoveNames = (builder: TransactionDataBuilder): string[] => {
    const names: Set<string> = new Set();

    for(const command of builder.commands) {
        if (!('MoveCall' in command)) continue;
        const tx = command.MoveCall;

        if (!tx) continue;

        console.log(tx);
        findDotMoveNames(tx.package).forEach(name => names.add(name));

        for (const type of (tx.typeArguments ?? [])) {
            findDotMoveNames(type).forEach(name => names.add(name));
        }
    }

    return [...names];
}

// Replace all dot move names in a transaction block with their respective package addresses.
export const replaceTargets = (builder: TransactionDataBuilder, nameMappings: NameMapping[]) => {
    const typesToResolve: string[] = [];
    for(const command of builder.commands) {
        const tx = command.MoveCall;

        if (!tx) continue;
    
        for (const mapping of nameMappings) {
            const address = mapping.data?.activeNetworkPackageAddress;
            if (!address) throw new Error(`No address found for ${mapping.name}`);
    
            if (tx.package && tx.package.includes(mapping.name)) {
                tx.package = address;
            }
            const types = tx.typeArguments;
            if (!types) continue;
            // We do our first round of replacing types.
            // Next, we'll do a "struct layout" resolution to make sure we have the correct types.
            for(let i=0; i < types.length; i++) {
                let t = types[i];
                if (!types[i].includes(mapping.name)) continue;
                types[i] = t.replaceAll(mapping.name, address);
                console.log(`Replacing ${t} with ${types[i]}`);
                // save type so we can do a resolution.
                typesToResolve.push(types[i]);
            }
            tx.typeArguments = types;
        }
    }
    return typesToResolve;
}

// Replace all types in a transaction block with their resolved types.
export const replaceTypes = (builder: TransactionDataBuilder, resolvedTypes: string[]) => {
    for (const command of builder.commands) {
        const tx = command.MoveCall;
        if (!tx) continue;

        const types = tx.typeArguments;
        if (!types) continue;

        for(let i=0; i < types.length; i++){
            for (const [index, type] of resolvedTypes.entries()) {
                if (!types[i].includes(type) || type === resolvedTypes[index]) continue;
                console.log(`Replacing type ${type} with ${resolvedTypes[index]}`);
                types[i] = types[i].replaceAll(type, resolvedTypes[index]);
                
            }
        }

        tx.typeArguments = types;
    }
}
