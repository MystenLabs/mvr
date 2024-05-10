import { useQuery } from "@tanstack/react-query";
import { useDotMoveClient } from "./useDotMoveClient";
import { useCurrentAccount, useSuiClient, useSuiClientContext } from "@mysten/dapp-kit";


export function useOwnedPackageInfoObjects(){
    const dotMoveClient = useDotMoveClient();
    const currentAccount = useCurrentAccount();
    const client = useSuiClient();
    const { network } = useSuiClientContext();
    
    return useQuery({
        queryKey: [network, 'package_info_objects', currentAccount?.address],
        queryFn: async () => {
            const type = await dotMoveClient.resolveType('package@dotmove::package_info::PackageInfo');

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
