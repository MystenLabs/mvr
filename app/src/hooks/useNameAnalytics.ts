import { useSuiClientsContext } from "@/components/providers/client-provider";
import { AppQueryKeys } from "@/utils/types";
import { isValidNamedPackage } from "@mysten/sui/utils";
import { useQuery } from "@tanstack/react-query";

export type NameAnalytics = {
  date_from: string;
  date_to: string;
  direct: number;
  propagated: number;
  total: number;
};

export function useNameAnalytics(name: string, network: "mainnet" | "testnet") {
  const endpoint = useSuiClientsContext().mvrExperimentalEndpoints[network];

  return useQuery({
    queryKey: [AppQueryKeys.NAME_ANALYTICS, name, network],
    queryFn: async () => {
      if (!isValidNamedPackage(name)) return null;

      const response = await fetch(`${endpoint}/v1/names/analytics/${name}`);
      const data = await response.json();
      return data;
    },

    select: (data) => {
      return {
        analytics: data.analytics as NameAnalytics[],
        dependents: data.total_dependents as number || 0,
      };
    },
  });
}
