import { useSuiClientsContext } from "@/components/providers/client-provider";
import { useQuery } from "@tanstack/react-query";
import { useActiveAddress } from "./useActiveAddress";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Network } from "@/utils/types";
import { fetchAllOwnedObjects } from "@/utils/query";

// TODO: Replace with `MVR` resolution when GQL goes live.
export const PackageInfoPackageIds = {
  mainnet: "",
  testnet: "0x32250323bab33181556e758219ccef308736939349640592b2e7c2252701f035",
  devnet: "",
  localnet: "",
};

const packageInfoType = (network: Network) =>
  `${PackageInfoPackageIds[network]}::package_info::PackageInfo`;

export const DefaultPackageDisplay = {
  gradientFrom: "E0E1EC",
  gradientTo: "BDBFEC",
  name: "",
  textColor: "030F1C",
};

export const DefaultColors = [
  {
    name: 'Blue',
    gradientFrom: 'E0E1EC',
    gradientTo: 'BDBFEC',
    textColor: '030F1C',
  },
  {
    name: 'Pink',
    gradientFrom: 'FCE4EC',
  }
]
export type PackageDisplayType = {
  gradientFrom: string;
  gradientTo: string;
  name: string;
  textColor: string;
}

export type PackageInfo = {
  objectId: string;
  packageAddress: string;
  upgradeCapId: string;
  display: PackageDisplayType;
  gitVersionsTableId: string;
  metadata: any;
};

const getPackageInfoObjects = async (
  client: SuiClient,
  address: string,
  network: Network,
) => {
  return fetchAllOwnedObjects({
    client,
    address,
    filter: {
      StructType: packageInfoType(network),
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  });
};

const parsePackageInfoContent = (cap?: SuiObjectResponse): PackageInfo => {
  if (!cap) throw new Error("Invalid upgrade cap object");
  if (!cap.data) throw new Error("Invalid upgrade cap object");
  if (!cap.data.content) throw new Error("Invalid upgrade cap object");
  if (cap.data.content.dataType !== "moveObject")
    throw new Error("Invalid upgrade cap object");

  const fields = cap.data.content.fields as Record<string, any>;

  return {
    objectId: fields.id.id,
    packageAddress: fields.package_address,
    upgradeCapId: fields.upgrade_cap_id,
    display: {
      gradientFrom: fields.display.fields.gradient_from,
      gradientTo: fields.display.fields.gradient_to,
      name: fields.display.fields.name,
      textColor: fields.display.fields.text_color,
    },
    gitVersionsTableId: fields.git_versioning.fields.id.id,
    metadata: fields.metadata,
  };
};

export function useGetPackageInfoObjects(network?: Network | "all") {
  const address = useActiveAddress();
  const clients = useSuiClientsContext();

  return useQuery({
    queryKey: ["getPackageInfoObjects", address, network],
    queryFn: async () => {
      // if no network is supplied, we want to lookup all networks
      if (network === "all") {
        const [mainnet, testnet, devnet, localnet] = await Promise.all(
          [
            getPackageInfoObjects(clients.mainnet, address!, "mainnet"),
            getPackageInfoObjects(clients.testnet, address!, "testnet"),
            getPackageInfoObjects(clients.devnet, address!, "devnet"),
            getPackageInfoObjects(clients.localnet, address!, "localnet"),
          ].map((p) => p.catch(() => undefined)),
        );

        return {
          mainnet,
          testnet,
          devnet,
          localnet,
        };
      } else {
        return {
          [network as Network]:
            (await getPackageInfoObjects(
              clients[network as Network],
              address!,
              network as Network,
            )) ?? [],
        };
      }
    },
    enabled: !!address && !!network,
    refetchOnMount: false,
    refetchOnReconnect: false,
    select(data) {
      const res: Record<string, PackageInfo[]> = {};

      for (const key of Object.keys(data)) {
        if (!data[key as Network]) continue;
        res[key] =
          data[key as Network]?.map((x) => parsePackageInfoContent(x)) ?? [];
      }

      return {
        mainnet: res.mainnet ?? [],
        testnet: res.testnet ?? [],
        devnet: res.devnet ?? [],
        localnet: res.localnet ?? [],
      };
    },
  });
}
