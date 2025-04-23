import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys, Network } from "@/utils/types";
import { isValidSuiNSName } from "@mysten/sui/utils";
import { useQuery } from "@tanstack/react-query";

export function useSuiNSResolution(name: string, network: Network) {
  const client = useSuiClientsContext()[network];

  return useQuery({
    queryKey: [AppQueryKeys.SUINS_NAME_RESOLUTION, name, network],
    queryFn: async () => {
      const address = await client.resolveNameServiceAddress({
        name,
      });
      return address;
    },
    enabled: !!name && isValidSuiNSName(name),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
