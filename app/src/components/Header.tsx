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
import { HeaderSearchBar } from "./public/HeaderSearchBar";

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

export default function Header({
  children,
  className,
  showSearch = true,
}: {
  children?: ReactNode;
  className?: string;
  showSearch?: boolean;
}) {
  return (
    <header className={cn("bg-header", className)}>
      <Sheet>
        <>
          <div className="container flex items-center justify-between py-md">
            <div className="flex items-center gap-xs">
              <Link href="/" className="flex w-fit items-center gap-xs">
                <MvrLogo className="flex-shrink-0" />
                <Text kind="display" className="text-[24px] font-extrabold">
                  MVR
                </Text>
              </Link>
              {showSearch && (
                <div className="max-lg:hidden">
                  {" "}
                  <HeaderSearchBar />{" "}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-xs lg:col-span-9 lg:gap-lg">
              <div className="max-lg:hidden">
                <Menu />
              </div>
              <SuiConnectPill />
              <SheetTrigger className="rounded-xs bg-bg-secondary p-xs lg:hidden">
                <MenuIcon />
              </SheetTrigger>
            </div>
          </div>
          {showSearch && (
            <div className="container px-sm pb-sm lg:hidden">
              <HeaderSearchBar className="!mx-0 w-full" />
            </div>
          )}
        </>

        <SheetContent>
          <SheetHeader>
            <SheetDescription className="gap-Regular pt-XLarge grid grid-cols-1">
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
