import { useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";
import { Text } from "../ui/Text";

export function AppViewer({ cap }: { cap: AppCap }) {
  const { data: app } = useGetAppFromCap(cap);

  console.log(app);
  return (
    <div>
      <Text variant="heading/bold" color="secondary" className="max-w-[750px]">
        {cap.normalizedName}
      </Text>

      <div className="break-words">
        {
            JSON.stringify(app)
        }
      </div>
    </div>
  );
}
