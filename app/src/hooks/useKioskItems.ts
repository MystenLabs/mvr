import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { AppQueryKeys, Network } from "@/utils/types";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { KioskOwnerCap } from "@mysten/kiosk";

export function useOwnedKiosks() {
    const address = useActiveAddress();
    const { mainnetKioskClient } = useSuiClientsContext();

    return useQuery({
        queryKey: [AppQueryKeys.OWNED_KIOSKS, address],
        queryFn: async () => {
            let hasNextPage = true;
            let nextCursor;
            let caps: KioskOwnerCap[] = [];

            while (hasNextPage) {
                const ownedKiosks = await mainnetKioskClient.getOwnedKiosks({
                    address: address!,
                    pagination: {
                        cursor: nextCursor!
                    }
                });
                hasNextPage = ownedKiosks.hasNextPage;
                nextCursor = ownedKiosks.nextCursor;
                caps.push(...ownedKiosks.kioskOwnerCaps);
            };

            return caps;
        },

        enabled: !!address
    })
}

export function useKioskItems() {
    const address = useActiveAddress();
    const ownedKiosks = useOwnedKiosks();

    const { mainnetKioskClient } = useSuiClientsContext();

    return useQuery({
        queryKey: [AppQueryKeys.KIOSK_ITEMS, address],
        queryFn: async () => {
            const items = await Promise.all(ownedKiosks.data!.map(async kiosk => {
                const kioskData = await mainnetKioskClient.getKiosk({ id: kiosk.kioskId });
                return kioskData.items.map(item => ({
                    ...item,
                    kioskCap: kiosk
                }));
            }));
            return items.flat();
        },

        enabled: !!address
    });
}
