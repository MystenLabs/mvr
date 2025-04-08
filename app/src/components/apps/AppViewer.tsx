import { useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";
import LoadingState from "../LoadingState";
import CreateOrUpdateApp from "../modals/apps/CreateOrUpdateApp";
import { Text } from "../ui/Text";

export function AppViewer({ cap }: { cap: AppCap }) {
  const { data: app, isLoading } = useGetAppFromCap(cap);

  if (isLoading) return <LoadingState />;

  return (
    <div className="flex flex-col">
      <Text kind="display" size="display-xs">
        {app?.normalized}
      </Text>
      <CreateOrUpdateApp appRecord={app} useDialog={false} />
    </div>
  );
}
