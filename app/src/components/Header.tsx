// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit";
import SuiLogo from "@/icons/SuiLogo";
import { Switch } from "./ui/switch";
import { useMVRContext } from "./providers/mvr-provider";
import { Input } from "./ui/input";
import { Content } from "@/data/content";
import { Text } from "./ui/Text";
import { SuiConnectPill } from "./wallet/SuiConnectPill";

const Links = [
  {
    name: "Apps",
    href: "/apps",
  },
  {
    name: "Packages",
    href: "/packages",
  },
];

export default function Header({
  updateUseCustomAddress,
  updateCustomAddress,
}: {
  updateUseCustomAddress: (val: boolean) => void;
  updateCustomAddress: (val: string) => void;
}) {
  const path = usePathname();

  const mvrContext = useMVRContext();

  return (
    <header className="border-b border-border-classic">
      <div className="container grid items-center justify-between py-Regular max-md:px-Regular md:grid-cols-2 lg:grid-cols-12">
        <div className="flex items-center gap-Small lg:col-span-3">
          <SuiLogo />
          <Text variant="heading/regular">mvr</Text>
        </div>
        <div className="text-center lg:col-span-4">
          {Links.map(({ name, href }) => (
            <Button
              asChild
              key={name}
              variant={path === href ? "default" : "link"}
            >
              <Link href={href}>{name}</Link>
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-Small lg:col-span-5">
          {mvrContext.isCustom ? (
            <Input
              value={mvrContext.customAddress}
              placeholder={Content.addressPlaceholder}
              onChange={(e) => updateCustomAddress(e.target.value)}
            />
          ) : (
            <SuiConnectPill />
          )}

          <div className="flex items-center gap-Small rounded-full border border-border-classic bg-background-secondary px-Small py-XSmall">
            <Text variant="regular/regular" color="secondary">
              Custom
            </Text>
            <Switch
              checked={mvrContext.isCustom}
              onCheckedChange={(checked) => updateUseCustomAddress(checked)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
