import { TransactionBlock } from "@mysten/sui.js/transactions";

export const findDotMoveNames = (type: string) => {
    const names = new Set();
    const partials = type.split('<').map(x => x.split("::")[0]);

    for(const part of partials) {
        if (part.includes('@')) names.add(part);
    }

    return [...names];
}

export const findTransactionBlockMoveNames = (serializedTransactionBlock: string) => {
    const serialized = JSON.parse(serializedTransactionBlock);
    const names = [];

    for(const tx of serialized.transactions) {
        names.push(...findDotMoveNames(tx.target ?? ''));

        for (const type of (tx.typeArguments ?? [])) {
            names.push(...findDotMoveNames(type));
        }
    }

    return [...new Set(names)]
}
