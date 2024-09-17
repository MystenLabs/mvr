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
    updateCustomAddress,
}: {
    updateCustomAddress: (val: boolean) => void;
}) {
  const path = usePathname();

  const mvrContext = useMVRContext();

  return (
    <header className="border-b border-content-primary/15">
      <div className="container flex justify-between py-Regular items-center">
        <div className="flex items-center gap-Small">
          <SuiLogo />
          mvr
        </div>
        {/* menu */}
        <div>
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
        <div className="flex items-center gap-Small justify-end">
          {!mvrContext.isCustom && <ConnectButton />}

          <div className="bg-background-secondary flex items-center gap-Small rounded-full border border-content-primary/15 px-Small py-XSmall">
            Custom
            <Switch
                checked={mvrContext.isCustom}
                onCheckedChange={(checked) => updateCustomAddress(checked) }
            />
          </div>
        </div>
      </div>
    </header>
  );
}
