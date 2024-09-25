import { useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";
import { Text } from "../ui/Text";
import { AvailableNetworks, Network } from "@/utils/types";
import { TabTitle } from "../ui/TabTitle";
import { ReactNode, useState } from "react";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import LoadingState from "../LoadingState";

export function AppViewer({ cap }: { cap: AppCap }) {
  const [network, setNetwork] = useState<Network>("mainnet");
  const { data: app, isLoading } = useGetAppFromCap(cap);

  if (isLoading) return <LoadingState />;

  if (cap.objectId !== app?.appCapId) {
    return (
      <AppViewerWrapper name={cap.normalizedName}>
        <EmptyState {...Content.invalidCap} />
      </AppViewerWrapper>
    );
  }

  return (
    <AppViewerWrapper name={cap.normalizedName}>
      <div className="border-b border-border-classic">
        {Object.values(AvailableNetworks).map((net) => (
          <TabTitle
            key={net}
            active={net === network}
            onClick={() => setNetwork(net as Network)}
          >
            <Text variant="small/regular">{net}</Text>
          </TabTitle>
        ))}
      </div>
      <div>{app?.appCapId}</div>
    </AppViewerWrapper>
  );
}

const AppViewerWrapper = ({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) => {
  return (
    <div>
      <Text variant="heading/bold" color="secondary" className="max-w-[750px]">
        {name}
      </Text>
      <div className="py-Regular">{children}</div>
    </div>
  );
};
