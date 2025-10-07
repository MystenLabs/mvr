import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { SuiClient } from "@mysten/sui/client";
import { AppQueryKeys, Network } from "@/utils/types";
import { fetchAllOwnedObjects } from "@/utils/query";
import { parsePackageInfoContent } from "@/utils/helpers";

export const DefaultPackageDisplay = {
  gradientFrom: "E0E1EC",
  gradientTo: "BDBFEC",
  name: "",
  textColor: "030F1C",
};

export const DefaultColors = [
  {
    name: "Blue",
    gradientFrom: "E0E1EC",
    gradientTo: "BDBFEC",
    textColor: "030F1C",
  },
  {
    name: "Pink",
    gradientFrom: "FCE4EC",
  },
];

const getPackageInfoObjects = async (
  client: SuiClient,
  address: string,
) => {
  return fetchAllOwnedObjects({
    client,
    address,
    filter: {
      StructType: `@mvr/metadata::package_info::PackageInfo`,
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  });
};

export function useGetPackageInfoObjects(network: Network) {
  const address = useActiveAddress();
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.OWNED_PACKAGE_INFOS, address, network],
    queryFn: async () => {
      return await getPackageInfoObjects(
        clients[network],
        address!,
      );
    },
    enabled: !!address && !!network,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select(data) {
      return data.map(parsePackageInfoContent);
    },
  });
}
