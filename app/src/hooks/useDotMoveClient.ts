import { useSuiClientContext } from "@mysten/dapp-kit";

import { DotMove } from "../../../scripts/src/sdk/dot-move";


export function useDotMoveClient(customNetwork?: 'mainnet' | 'testnet' | 'devnet') {
    const { network } = useSuiClientContext();
    if (!network || network === 'localnet') throw new Error("Not Supported");

    const DotMoveClient = new DotMove({
        activeGraphqlEndpoint: `https://sui-${customNetwork ?? network}.mystenlabs.com/graphql`,
        network: customNetwork ?? network as 'mainnet' | 'testnet' | 'devnet'
    });

    return DotMoveClient;
}
