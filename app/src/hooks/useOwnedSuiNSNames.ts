import { useSuiClientsContext } from "@/components/providers/client-provider";

// we default these to mainnet, as we don't have cross-network support
// for apps registration
// TODO: Add support for KIOSK-held names.
export function useOwnedSuinsNames() {
  const client = useSuiClientsContext().mainnet;
}
