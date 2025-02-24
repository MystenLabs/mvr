import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Constants } from "@/lib/constants";
import { AppQueryKeys } from "@/utils/types";
import { normalizeSuiNSName } from "@mysten/sui/utils";
import { useQuery } from "@tanstack/react-query";

export function useIsNameAvailable(name: string, enabled = true) {
    const client = useSuiClientsContext().mainnet;

    return useQuery({
        queryKey: [AppQueryKeys.IS_NAME_AVAILABLE, name],
        queryFn: async () => {
            const [suinsName, appName] = name.split('/');

            if (!appName || appName.length === 0) return false;

            const nsNameFormatted = normalizeSuiNSName(suinsName || '', 'dot');

            const exists = await client.getDynamicFieldObject({
                parentId: Constants.appsRegistryTableId,
                name: {
                    type: `0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::name::Name`,
                    value: {
                        app: [appName],
                        org: {

                            labels: nsNameFormatted.split('.').reverse()
                        }
                    }
                }
            });

            return !!exists.error;
        },
        enabled
    })
  
}
