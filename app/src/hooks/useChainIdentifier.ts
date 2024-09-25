import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Network } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

export const STATIC_CHAIN_IDENTIFIERS = {
    mainnet: '35834a8a',
    testnet: '4c78adac'
}

export function useChainIdentifier(network: Network) {
    const clients = useSuiClientsContext();
  
    return useQuery({
      queryKey: ["chainIdentifier", network],
      queryFn: async () => {

        if (network === 'mainnet') {
            return STATIC_CHAIN_IDENTIFIERS.mainnet;
        }
        if (network === 'testnet') {
            return STATIC_CHAIN_IDENTIFIERS.testnet;
        }

        const chainId = await clients[network].getChainIdentifier();
        return chainId;
      },
      refetchOnMount: false,
      refetchOnReconnect: false,
    });
  }
