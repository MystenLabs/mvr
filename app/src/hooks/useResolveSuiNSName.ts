// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";

/**
 * Reverse-resolves an address to its default SuiNS name via the gRPC core API.
 * Replaces dapp-kit's legacy `useResolveSuiNSName`.
 */
export function useResolveSuiNSName(address?: string) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ["resolve-suins-name", address],
    enabled: !!address,
    queryFn: async () => {
      const { data } = await client.defaultNameServiceName({
        address: address!,
      });
      return data.name;
    },
  });
}
