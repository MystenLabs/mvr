"use client";

import { ReactNode, ComponentPropsWithoutRef, useState } from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  Root,
  Trigger,
  Item,
} from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "../ui/button";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { SuiAccountInfo } from "./AccountInfo";
import clsx from "clsx";
import SvgCopy from "@/icons/Copy";
import SvgCopied from "@/icons/Copied";
import SvgDelete from "@/icons/Delete";
import { Text } from "../ui/Text";
import { cn } from "@/lib/utils";

type AccountContentProps = {
  address: string;
  img?: string;
};

type AccountSelectorProps = {
  children: ReactNode;
  trigger: ReactNode;
  align?: "start" | "end";
};

export function AccountSelector({
  trigger,
  children,
  align = "end",
}: AccountSelectorProps) {
  return (
    <Root>
      <Trigger asChild>
        <Button
          className="flex gap-2"
          variant="gradientPurpleBlueOp20"
          size="header"
        >
          {trigger}
          <ChevronDown className="h-4 w-4 data-[state=open]:rotate-180" />
        </Button>
      </Trigger>
      <DropdownMenuContent
        sideOffset={12}
        align={align}
        asChild
        className="border-stroke-primary z-50 w-[372px] overflow-hidden rounded-lg border backdrop-blur-huge max-sm:!w-[90vw]"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <div className="placeholder:text-content-primary-inactive bg-bg-quarternaryBleedthrough flex h-full w-full flex-col gap-2 overflow-hidden p-2 transition-all focus:pl-16 focus:outline-none focus:placeholder:text-transparent md:w-[370px]">
            {children}
          </div>
        </motion.div>
      </DropdownMenuContent>
    </Root>
  );
}

function AccountContentActionButton({
  onClick,
  icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <Button
      className="hover:bg-bg-accentBleedthrough3 bg-bg-quarternaryBleedthrough group flex h-[68px] w-[107px] flex-col items-center justify-center gap-1 px-4 py-2 transition ease-in-out"
      onSelect={onClick}
      onClick={onClick}
      variant="link"
    >
      {icon}
      <Text
        kind="paragraph"
        size="paragraph-xs"
        className={clsx("group-hover:text-content-primary", className)}
      >
        {label}
      </Text>
    </Button>
  );
}

export function AccountContent({
  address,
  isOpen,
  disconnect,
  onClick,
  explorerUrl,
  ...props
}: AccountContentProps & {
  isOpen: boolean;
  disconnect: () => void;
  explorerUrl?: string;
} & ComponentPropsWithoutRef<typeof Item>) {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async () => {
    if (copied) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {}
  };

  const ActiveAcctInfo = <SuiAccountInfo address={address} />;

  return (
    <DropdownMenuItem
      {...props}
      onClick={onClick}
      className={cn(
        "hover:bg-bg-accentBleedthrough3 relative rounded-md outline-none duration-150 ease-in-out focus:placeholder:text-transparent",
        isOpen &&
          "bg-bg-quarternaryBleedthrough hover:bg-bg-quarternaryBleedthrough",
      )}
    >
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            className="overflow-hidden"
            variants={{
              open: { opacity: 1, height: "auto", overflow: "hidden" },
              collapsed: { opacity: 0, height: 0, overflow: "hidden" },
            }}
            transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="px-l py-m relative flex h-full w-full flex-col gap-2 overflow-hidden transition-colors focus:outline-none">
              <div className="rounded-6xl relative z-20 mb-2 flex w-full cursor-pointer items-center justify-between focus:outline-none">
                {ActiveAcctInfo}
                <ChevronDown className="relative h-4 w-4 text-content-primary" />
              </div>
              <div className="relative z-20 flex flex-col items-start gap-2">
                <div className="flex w-full flex-1 gap-[10px]">
                  <AccountContentActionButton
                    onClick={copyToClipboard}
                    className={copied ? "!text-content-positive" : ""}
                    icon={
                      <SvgCopy
                        height={12}
                        width={12}
                        className="text-content-primary"
                      />
                    }
                    label={copied ? "Copied" : "Copy"}
                  />
                  <AccountContentActionButton
                    onClick={() => window.open(explorerUrl, "_blank")}
                    icon={
                      <ArrowUpRight
                        height={16}
                        width={16}
                        className="h-4 w-4 text-content-primary"
                      />
                    }
                    label="Explorer"
                  />
                  <AccountContentActionButton
                    onClick={disconnect}
                    icon={
                      <SvgDelete className="h-4 w-4 text-content-primary" />
                    }
                    label="Disconnect"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="flex w-full cursor-pointer items-center justify-between rounded-sm px-6 py-4 hover:bg-background-secondary focus:outline-none focus:placeholder:text-transparent">
              {ActiveAcctInfo}
              <ChevronDown className="relative h-4 w-4 -rotate-90 text-content-secondary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DropdownMenuItem>
  );
}
