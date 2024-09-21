import { useSuiClientsContext } from "@/components/providers/client-provider";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import { useQuery } from "@tanstack/react-query";

export function usePackageModules(packageId: string) {
    const selectedNetwork = usePackagesNetwork();
    const clients = useSuiClientsContext();

    const client = clients[selectedNetwork];

    return useQuery({
        queryKey: ['packageModule', packageId],

        queryFn: async () => {

            const modules = await client.getNormalizedMoveModulesByPackage({
                package: packageId
            });

            return modules;
        },

        select(data) {
            return Object.keys(data);
        },
        enabled: !!packageId
    })
}
