import { Content } from "@/data/content";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { useMVRContext } from "./providers/mvr-provider";
import { useEffect, useMemo, useState } from "react";
import { Text } from "./ui/Text";
import { Button } from "./ui/button";

export function NetworkMissmatch({
  expectedNetwork,
}: {
  expectedNetwork: string;
}) {
  const network = useWalletNetwork();
  const isCustom = useMVRContext().isCustom;

  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isCustom && network !== expectedNetwork);
  }, [isCustom, network, expectedNetwork]);

  if (!show) return null;

  return (
    <div className="bg-background-secondary-solid fixed bottom-4 lg:right-12 z-50 w-full max-w-full rounded-md border-l-8 border-primary lg:bottom-20 lg:w-[400px]">
      <div className="container px-Small py-Small text-center">
        <Text variant="small/regular" className="text-white">
          {Content.networkMissmatch(expectedNetwork)}
        </Text>
        <Button
          variant="outline"
          size="sm"
          className="mt-Small"
          onClick={() => setShow(false)}
        >
          Hide the warning
        </Button>
      </div>
    </div>
  );
}
