import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { AppQueryKeys, Network } from "@/utils/types";
import { parsePackageInfoContent } from "@/utils/helpers";

export function useGetPackageInfo({
  network, objectId
}: {
  network: Network;
  objectId?: string;
}) {
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: [AppQueryKeys.PACKAGE_INFO_BY_ID, objectId],
    queryFn: async () => {
      const infoObj = await clients[network].getObject({
        id: objectId!,
        options: {
          showContent: true,
          showDisplay: true,
        }
      });

      return infoObj;
    },
    enabled: !!objectId,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select(data) {
      return parsePackageInfoContent(data);
    },
  });
}
