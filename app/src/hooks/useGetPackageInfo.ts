import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
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
    queryKey: [AppQueryKeys.PACKAGE_INFO_BY_ID, objectId, network],
    queryFn: async () => {
      const { object } = await clients[network].core.getObject({
        objectId: objectId!,
        include: {
          content: true,
          display: true,
        },
      });

      return object;
    },
    enabled: !!objectId,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    select(data) {
      return parsePackageInfoContent(data);
    },
  });
}
