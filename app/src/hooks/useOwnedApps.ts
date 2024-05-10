import { useQuery } from "@tanstack/react-query";
import { useDotMoveClient } from "./useDotMoveClient";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";

export function useOwnedApps(){
    const currentAccount = useCurrentAccount();
    const dotMoveClient = useDotMoveClient('mainnet');
    
    return useQuery({
        queryKey: ['app_caps', currentAccount?.address],
        queryFn: async () => {
            const type = await dotMoveClient.resolveType('core@dotmove::app_record::AppCap');
            const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

            return client.getOwnedObjects({
                filter: {
                    StructType: type,
                },
                owner: currentAccount?.address!,
                options: {
                    showDisplay: true,
                    showContent: true
                }
            });
        },
        enabled: !!currentAccount
    })
}
