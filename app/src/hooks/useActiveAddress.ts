// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMVRContext } from "@/components/providers/mvr-provider";

export function useActiveAddress() {
  const { isCustom, customAddress } = useMVRContext();
  const account = useCurrentAccount();

  return isCustom ? customAddress : account?.address;
}
