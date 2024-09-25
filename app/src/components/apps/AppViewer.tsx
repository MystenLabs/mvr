import { useGetAppFromCap } from "@/hooks/useGetApp";
import { AppCap } from "@/hooks/useOwnedApps";

export function AppViewer({ cap }: { cap: AppCap }) {

    const { data: app } = useGetAppFromCap(cap);

    console.log(app);
  return <div></div>;
}
