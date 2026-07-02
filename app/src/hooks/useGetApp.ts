import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { AppCap } from "./useOwnedApps";
import { useSuiClientsContext } from "@/components/providers/client-provider";
import { Constants } from "@/lib/constants";
import { AppRecord as AppRecordStruct } from "@/contracts/mvr_core/app_record";
import { STATIC_CHAIN_IDENTIFIERS } from "./useChainIdentifier";

export type AppInfo = {
  packageAddress: string;
  upgradeCapId: string;
  packageInfoId: string;
};

export type AppRecord = {
  objectId: string;
  mainnet?: AppInfo | null;
  testnet?: AppInfo | null;
  appCapId: string;
  metadata: Record<string, string>;
  nsNftId: string;
  appName: string;
  orgName: string;
  normalized: string;
};

type ParsedRecord = ReturnType<typeof AppRecordStruct.parse>;

const parseAppInfo = (info: {
  package_address?: string | null;
  upgrade_cap_id?: string | null;
  package_info_id?: string | null;
}): AppInfo => {
  return {
    packageAddress: info.package_address ?? "",
    upgradeCapId: info.upgrade_cap_id ?? "",
    packageInfoId: info.package_info_id ?? "",
  };
};

const format = (input: {
  record: ParsedRecord;
  appName: string;
  orgName: string;
  normalized: string;
}): AppRecord => {
  const { record } = input;
  // `app_info` can be `Some` with an empty/None `package_info_id` (an app with
  // no mainnet package yet), which would otherwise be a truthy-but-empty object.
  // Treat "no package info id" as no mainnet package.
  const mainnetData = record.app_info?.package_info_id
    ? parseAppInfo(record.app_info)
    : null;

  // All the network data are mapped here.
  const networks = record.networks.contents.map((x) => ({
    key: x.key,
    value: parseAppInfo(x.value),
  }));

  const testnet = networks.find(
    (x) => x.key === STATIC_CHAIN_IDENTIFIERS.testnet,
  )?.value;

  return {
    objectId: record.app_cap_id,
    mainnet: mainnetData,
    testnet,
    appCapId: record.app_cap_id,
    metadata: record.metadata.contents.reduce(
      (acc: Record<string, string>, x) => {
        acc[x.key] = x.value;
        return acc;
      },
      {},
    ),
    nsNftId: record.ns_nft_id,
    appName: input.appName,
    orgName: input.orgName,
    normalized: input.normalized,
  };
};

export function useGetAppFromCap(cap: AppCap) {
  const client = useSuiClientsContext().mainnet;

  return useQuery({
    queryKey: [AppQueryKeys.APP, cap.normalizedName],
    queryFn: async () => {
      const { dynamicField } = await client.core.getDynamicField({
        parentId: Constants.appsRegistryTableId,
        name: cap.dfName,
      });

      return {
        record: AppRecordStruct.parse(dynamicField.value.bcs),
        appName: cap.appName,
        orgName: cap.orgName,
        normalized: cap.normalizedName,
      };
    },
    select: (data) => {
      return format(data);
    },
  });
}
