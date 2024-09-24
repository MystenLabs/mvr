// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Content } from "@/data/content";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { useMVRContext } from "./providers/mvr-provider";
import { useMemo } from "react";

export function NetworkMissmatch({
  expectedNetwork,
}: {
  expectedNetwork: string;
}) {
  const network = useWalletNetwork();
  const isCustom = useMVRContext().isCustom;

  const show = useMemo(() => {
    return !isCustom && network !== expectedNetwork;
  }, [isCustom, network, expectedNetwork]);

  if (!show) return null;

  return (
    <div className="bg-primary">
      <div className="container py-Small text-center">
        {Content.networkMissmatch(expectedNetwork)}
      </div>
    </div>
  );
}
