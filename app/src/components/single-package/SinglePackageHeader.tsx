import { ResolvedName } from "@/hooks/mvrResolution";
import { Text } from "../ui/Text";
import ImageWithFallback from "../ui/image-with-fallback";

export function SinglePackageHeader({
  name,
  network,
}: {
  name: ResolvedName;
  network: "mainnet" | "testnet";
}) {
  return (
    <div className="container flex items-center justify-between py-md md:py-lg">
      <div className="flex items-center gap-sm">
        <ImageWithFallback
          src={name.metadata?.icon_url}
          className="h-14 w-14 rounded-sm"
        />
        <div className="flex flex-col gap-2xs">
          <Text kind="heading" size="heading-regular">
            {name.name}
          </Text>
          <Text
            kind="paragraph"
            size="paragraph-xs"
            className="text-content-secondary"
          >
            Version {name.version} -{" "}
            <span className="capitalize">{network}</span>
          </Text>
        </div>
      </div>
    </div>
  );
}
