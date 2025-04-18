import { ResolvedName } from "@/hooks/mvrResolution";
import { useGetMvrVersionAddresses } from "@/hooks/useGetMvrVersionAddresses";
import { usePackagesNetwork } from "../providers/packages-provider";
import { beautifySuiAddress } from "@/lib/utils";
import { Text } from "../ui/Text";
import { CopyBtn } from "../ui/CopyBtn";
import LoadingState from "../LoadingState";
import { DependentsCountLabel } from "./SinglePackageTabs";
import { LoadMore } from "../ui/load-more";

export function SinglePackageVersions({ name }: { name: ResolvedName }) {
  const network = usePackagesNetwork() as "mainnet" | "testnet";

  const { data: versions, isLoading, hasNextPage, fetchNextPage } = useGetMvrVersionAddresses(
    name.name,
    name.version,
    network,
  );

  if (isLoading) {
    return <LoadingState size="sm" title="" description="Loading..." />;
  }

  return (
    <>
      <Text
        as="div"
        kind="heading"
        size="heading-regular"
        className="flex items-center gap-sm"
      >
        Versions <DependentsCountLabel count={name.version} hasMore={false} />
      </Text>
      <table className="w-full">
        <thead>
          <tr className="border-b border-stroke-secondary text-left">
            <th className="py-sm">
              <Text as="span" size="label-small" kind="label">
                Version
              </Text>
            </th>
            <th className="py-sm">
              <Text as="span" size="label-small" kind="label">
                Address
              </Text>
            </th>
          </tr>
        </thead>
        <tbody>
          {versions?.map((version) => (
            <tr
              key={version.version}
                className="border-b border-stroke-secondary text-content-secondary"
              >
                <td className="py-sm">
                  <Text as="span" size="label-small" kind="label">
                    {version.version}
                  </Text>

                  {version.version === name.version && (
                    <Text
                      as="span"
                      size="label-xs"
                      kind="label"
                      className="ml-md rounded-md bg-bg-accentBleedthrough3 px-sm py-xs"
                    >
                      Latest
                    </Text>
                  )}
                </td>
                <td className="flex items-center gap-sm py-sm">
                  <Text as="div" size="label-small" kind="label">
                    {beautifySuiAddress(version.address, 10)}
                  </Text>
                  <CopyBtn text={version.address} />
                </td>
            </tr>
          ))}
        </tbody>
      </table>
      <LoadMore
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
      />
    </>
  );
}
