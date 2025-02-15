// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import SuiLogo from "@/icons/SuiLogo";
import { Switch } from "./ui/switch";
import { useMVRContext } from "./providers/mvr-provider";
import { Input } from "./ui/input";
import { Content } from "@/data/content";
import { Text } from "./ui/Text";
import { SuiConnectPill } from "./wallet/SuiConnectPill";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { MenuIcon } from "lucide-react";

const Links = [
  {
    name: "Packages",
    href: "/apps",
  },
  {
    name: "Metadata",
    href: "/packages",
  },
];

export default function Header({
  updateUserCustomAddress,
  updateCustomAddress,
}: {
  updateUserCustomAddress: (val: boolean) => void;
  updateCustomAddress: (val: string) => void;
}) {
  const mvrContext = useMVRContext();

  return (
    <header>
      <Sheet>
        <div className="container grid grid-cols-2 items-center justify-between py-Regular lg:grid-cols-12">
          <Link
            href="/apps"
            className="flex items-center gap-Small lg:col-span-3 w-fit"
          >
            <SuiLogo />
            <Text variant="heading/regular">mvr</Text>
          </Link>
          <div className="text-center max-lg:hidden lg:col-span-4">
            <Menu />
          </div>
          <div className="flex items-center justify-end gap-Small lg:col-span-5">
            {!mvrContext.isCustom && <SuiConnectPill />}

            <CustomAddressSetup
              {...{ updateUserCustomAddress, updateCustomAddress }}
              className="flex items-center gap-Small max-lg:hidden"
            />
            <SheetTrigger className="lg:hidden">
              <MenuIcon />
            </SheetTrigger>
          </div>
        </div>
        <SheetContent>
          <SheetHeader>
            <SheetDescription className="grid grid-cols-1 gap-Regular pt-XLarge">
              <div className="text-left">
                <Menu />
              </div>

              <CustomAddressSetup
                {...{ updateUserCustomAddress, updateCustomAddress }}
                className="gap-Regular"
              />
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </header>
  );
}

interface CustomAddressSetupInterface
  extends React.HTMLAttributes<HTMLDivElement> {
  updateUserCustomAddress: (val: boolean) => void;
  updateCustomAddress: (val: string) => void;
}

const CustomAddressSetup = ({
  updateUserCustomAddress,
  updateCustomAddress,
  ...rest
}: CustomAddressSetupInterface) => {
  const mvrContext = useMVRContext();
  return (
    <div {...rest}>
      {mvrContext.isCustom && (
        <Input
          value={mvrContext.customAddress}
          placeholder={Content.addressPlaceholder}
          onChange={(e) => updateCustomAddress(e.target.value)}
          className="max-lg:w-full lg:min-w-[400px]"
        />
      )}

      {/* <div className="flex items-center gap-Small rounded-full border border-border-classic bg-background-secondary px-Small py-XSmall max-lg:mt-Regular max-lg:justify-between">
        <Text variant="small/regular" color="secondary">
          Custom
        </Text>

        <Switch
          checked={mvrContext.isCustom}
          onCheckedChange={(checked) => updateUserCustomAddress(checked)}
        />
      </div> */}
    </div>
  );
};

const Menu = () => {
  const path = usePathname();
  return (
    <>
      {Links.map(({ name, href }) => (
        <SheetClose key={name} asChild>
          <Button
            asChild
            key={name}
            variant={path === href ? "default" : "link"}
            className="max-lg:w-full"
          >
            <Link href={href}>{name}</Link>
          </Button>
        </SheetClose>
      ))}
    </>
  );
};
