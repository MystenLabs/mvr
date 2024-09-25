import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { AppCap } from "./useOwnedApps";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Constants } from "@/lib/constants";

export function useGetAppFromCap(cap: AppCap) {
    const client = useSuiClientsContext().mainnet;

    console.log(cap.dfName);
    return useQuery({
        queryKey: [AppQueryKeys.APP, cap.appName],
        queryFn: async () => {
            const data = await client.getDynamicFieldObject({
                parentId: Constants.appsRegistryTableId,
                name: cap.dfName,
            });

            console.log(data);

            return data;
        },
    })
}
