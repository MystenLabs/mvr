import { AppInfo, AppRecord, useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";
import { Text } from "../ui/Text";
import { AvailableNetworks, Network } from "@/utils/types";
import { TabTitle } from "../ui/TabTitle";
import { ReactNode, useState } from "react";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import LoadingState from "../LoadingState";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import CreateOrUpdateApp from "../modals/apps/CreateOrUpdateApp";

export function AppViewer({ cap }: { cap: AppCap }) {
  const [network, setNetwork] = useState<Network>("mainnet");
  const { data: app, isLoading } = useGetAppFromCap(cap);

  if (isLoading) return <LoadingState />;

  if (cap.objectId !== app?.appCapId) {
    return (
      <AppViewerWrapper name={cap.normalizedName} record={app}>
        <EmptyState {...Content.invalidCap} />
      </AppViewerWrapper>
    );
  }

  return (
    <AppViewerWrapper name={cap.normalizedName} record={app}>
      <div className="mb-Regular border-b border-border-classic">
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

      <SinglePackageView appInfo={app[network as "mainnet" | "testnet"]} />
    </AppViewerWrapper>
  );
}

const AppViewerWrapper = ({
  name,
  children,
  record,
}: {
  record?: AppRecord;
  name: string;
  children: ReactNode;
}) => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <CreateOrUpdateApp
        appRecord={record}
        closeDialog={() => setShowDialog(false)}
      />
      <Text variant="heading/bold" color="secondary" className="max-w-[750px]">
        {name}
      </Text>
      <DialogTrigger>
        <Button variant="link">Edit package</Button>
      </DialogTrigger>
      <div className="py-Regular">{children}</div>
    </Dialog>
  );
};

// TODO: Fill this one in.
const SinglePackageView = ({ appInfo }: { appInfo?: AppInfo | null }) => {
  if (!appInfo)
    return (
      <EmptyState size="md" {...Content.noPackageConnected}>
        <DialogTrigger>
          <Button variant="link">{Content.noPackageConnected.button}</Button>
        </DialogTrigger>
      </EmptyState>
    );

  return (
    <div>
      <Text variant="small/regular" color="secondary">
        Package Address: {appInfo.packageAddress}
      </Text>
      <Text variant="small/regular" color="secondary">
        Upgrade Cap ID: {appInfo.upgradeCapId}
      </Text>
      <Text variant="small/regular" color="secondary">
        Package Info ID: {appInfo.packageInfoId}
      </Text>
    </div>
  );
};
