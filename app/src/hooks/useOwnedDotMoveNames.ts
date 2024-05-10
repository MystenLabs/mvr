import { useQuery } from "@tanstack/react-query";
import { useDotMoveClient } from "./useDotMoveClient";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";

export function useOwnedDotMoveNames(){
    const currentAccount = useCurrentAccount();
    const dotMoveClient = useDotMoveClient('mainnet');
    
    return useQuery({
        queryKey: ['dot_move_names', currentAccount?.address],
        queryFn: async () => {
            const type = await dotMoveClient.resolveType('core@dotmove::dot_move::DotMove');
            const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

            return client.getOwnedObjects({
                filter: {
                    StructType: type,
                },
                owner: currentAccount?.address!,
                options: {
                    showContent: true,
                    showDisplay: true
                }
            });
        },
        enabled: !!currentAccount
    })
}
