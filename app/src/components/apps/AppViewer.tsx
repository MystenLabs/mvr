import { AppInfo, AppRecord, useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";
import { Text } from "../ui/Text";
import { AvailableNetworks, Network } from "@/utils/types";
import { TabTitle } from "../ui/TabTitle";
import { ReactNode, useEffect, useState } from "react";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import LoadingState from "../LoadingState";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import CreateOrUpdateApp from "../modals/apps/CreateOrUpdateApp";
import { useGetPackageInfo } from "@/hooks/useGetPackageInfo";
import { PackageInfoViewer } from "../packages/PackageInfoViewer";
import { PackagesNetworkContext } from "../providers/packages-provider";
import { AnimatedCheckmark } from "@/icons/AnimatedCheckmark";

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

      <SinglePackageView
        appInfo={app[network as "mainnet" | "testnet"]}
        network={network}
      />
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
      <Text
        variant="heading/bold"
        color="secondary"
        className="max-w-[750px] pb-Regular"
      >
        {name}
      </Text>
      <DialogTrigger>
        <Button variant="tertiary">Edit Application</Button>
      </DialogTrigger>
      <div className="py-Regular">{children}</div>
    </Dialog>
  );
};

// TODO: Fill this one in.
const SinglePackageView = ({
  appInfo,
  network,
}: {
  appInfo?: AppInfo | null;
  network: Network;
}) => {
  const { data: packageInfoDetails, isLoading } = useGetPackageInfo({
    objectId: appInfo?.packageInfoId,
    network,
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setShowDetails(false);
  }, [appInfo, network]);

  if (!appInfo)
    return (
      <EmptyState size="md" {...Content.noPackageConnected}>
        <DialogTrigger>
          <Button variant="default">{Content.noPackageConnected.button}</Button>
        </DialogTrigger>
      </EmptyState>
    );

  if (isLoading) return <LoadingState />;

  return (
    <PackagesNetworkContext.Provider value={network}>
      {!showDetails && (
        <div className="mx-auto flex max-w-[450px] flex-col gap-Small py-Large text-center">
          <AnimatedCheckmark />
          <Text variant="heading/bold">{ Content.app.connected.title }</Text>
          <Text variant="regular/regular" color="tertiary" family="inter">
            {Content.app.connected.description} <strong>{network}</strong>
          </Text>

          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
          >
            {Content.app.connected.button}
          </Button>
        </div>
      )}

      {showDetails && packageInfoDetails && (
        <PackageInfoViewer packageInfo={packageInfoDetails} disableEdits />
      )}
    </PackagesNetworkContext.Provider>
  );
};
