import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Constants } from "@/lib/constants";
import { AppQueryKeys } from "@/utils/types";
import { normalizeSuiNSName } from "@mysten/sui/utils";
import { useQuery } from "@tanstack/react-query";
import { Name } from "@/contracts/mvr_core/name";

export function useIsNameAvailable(name: string, enabled = true) {
    const client = useSuiClientsContext().mainnet;

    return useQuery({
        queryKey: [AppQueryKeys.IS_NAME_AVAILABLE, name],
        queryFn: async () => {
            const [suinsName, appName] = name.split('/');

            if (!appName || appName.length === 0) return false;

            const nsNameFormatted = normalizeSuiNSName(suinsName || '', 'dot');

            // 2.x throws when the dynamic field doesn't exist (v1 returned null),
            // so absence == available.
            try {
                await client.core.getDynamicField({
                    parentId: Constants.appsRegistryTableId,
                    name: {
                        type: Name.typeTag(),
                        bcs: Name.serialize({
                            org: {
                                labels: nsNameFormatted.split('.').reverse(),
                            },
                            app: [appName],
                        }).toBytes(),
                    },
                });
                return false;
            } catch {
                return true;
            }
        },
        enabled
    })

}
