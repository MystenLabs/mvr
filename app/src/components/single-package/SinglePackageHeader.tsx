import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";
import { beautifySuiAddress } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";
import Link from "next/link";
import { type PackageOrgContext } from "@/lib/mvr-api";
import { PublishedBy } from "./PublishedBy";
import { getAppFromName, getOrgFromName, orgPath } from "@/lib/names";

export function SinglePackageHeader({
  name,
  network,
  orgContext,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
  /** Server-provided data about the org (avatar, package count), if any. */
  orgContext?: PackageOrgContext;
}) {
  const org = getOrgFromName(name.name);

  return (
    <div className="container flex flex-col justify-between gap-md py-md md:flex-row md:items-center md:py-lg">
      <div className="flex items-center gap-md">
        <ImageWithFallback
          key={name.metadata?.icon_url}
          src={name.metadata?.icon_url}
          alt=""
          className="h-14 w-14 rounded-sm"
        />
        <div className="flex flex-col gap-2xs">
          <Text as="h1" kind="heading" size="heading-regular">
            <Link href={orgPath(org)} className="hover:underline">
              {org}
            </Link>
            /{getAppFromName(name.name)}
          </Text>
          <Text
            kind="paragraph"
            size="paragraph-xs"
            className="flex items-center gap-2xs text-content-secondary"
          >
            Version {name.version} -{" "}
            <span className="capitalize">{network}</span> -{" "}
            {beautifySuiAddress(name.package_address)}
            <CopyBtn text={name.package_address} className="ml-2xs" size="sm" />
          </Text>
        </div>
      </div>
      <PublishedBy
        org={org}
        iconUrl={orgContext?.org === org ? orgContext.iconUrl : null}
        packagesCount={
          orgContext?.org === org ? orgContext.packagesCount : null
        }
      />
    </div>
  );
}
