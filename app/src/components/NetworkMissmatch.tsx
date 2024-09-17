// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Content } from "@/data/content";

export function NetworkMissmatch({
  expectedNetwork,
}: {
  expectedNetwork: string;
}) {
  return (
    <div className="border-b border-border-classic bg-background">
      <div className="container py-Small text-center">
        {Content.networkMissmatch(expectedNetwork)}
      </div>
    </div>
  );
}
