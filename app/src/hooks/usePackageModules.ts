import { useSuiClientsContext } from "@/components/providers/client-provider";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

export function usePackageModules(packageId: string) {
  const selectedNetwork = usePackagesNetwork();
  const clients = useSuiClientsContext();

  const client = clients[selectedNetwork];

  return useQuery({
    queryKey: [AppQueryKeys.UPGRADE_CAP_MODULE, packageId],

    queryFn: async () => {
      // No core-level "list modules"; use the gRPC MovePackage service.
      const res = await client.movePackageService.getPackage({
        packageId,
      }).response;

      return res.package?.modules ?? [];
    },

    select(data) {
      return data
        .map((m) => m.name)
        .filter((name): name is string => Boolean(name));
    },
    enabled: !!packageId,
  });
}
