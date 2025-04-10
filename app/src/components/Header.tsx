// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { Text } from "./ui/Text";
import { SuiConnectPill } from "./wallet/SuiConnectPill";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTrigger,
} from "./ui/sheet";
import { MenuIcon } from "lucide-react";
import MvrLogo from "@/icons/MvrLogo";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const Links = [
  {
    name: "Packages",
    href: "/apps",
  },
  {
    name: "Metadata",
    href: "/metadata",
  },
];

export default function Header({ children, className }: { children?: ReactNode, className?: string }) {
  return (
    <header className={cn("bg-header", className)}>
      <Sheet>
        <div className="py-md container grid grid-cols-2 items-center justify-between lg:grid-cols-12">
          <Link
            href="/apps"
            className="gap-xs flex w-fit items-center lg:col-span-3"
          >
            <MvrLogo />
            <Text kind="display" className="text-[24px] font-extrabold">
              MVR
            </Text>
          </Link>
          <div className="gap-xs lg:gap-lg flex items-center justify-end lg:col-span-9">
            <div className="max-lg:hidden">
              <Menu />
            </div>
            <SuiConnectPill />
            <SheetTrigger className="lg:hidden bg-bg-secondary rounded-xs p-xs">
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
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>

      {children}
    </header>
  );
}

const Menu = () => {
  const path = usePathname();
  return (
    <>
      {Links.map(({ name, href }) => (
        <SheetClose key={name} asChild>
          <Button
            asChild
            key={name}
            size="fit"
            variant={path === href ? "linkActive" : "link"}
            className="px-xs max-lg:w-full"
          >
            <Link href={href}>{name}</Link>
          </Button>
        </SheetClose>
      ))}
    </>
  );
};
