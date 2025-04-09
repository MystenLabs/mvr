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

      <Text
        kind="heading"
        size="heading-xs"
        className="mt-md mb-md text-content-secondary"
      >
        Package Details
      </Text>

      <div className="bg-bg-secondary p-sm lg:p-lg rounded-xl">
        <CreateOrUpdateApp
          key={app?.objectId}
          appRecord={app}
          useDialog={false}
        />
      </div>
    </div>
  );
}
