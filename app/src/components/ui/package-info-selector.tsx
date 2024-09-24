"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoDisplay } from "@/icons/PackageInfoDisplay";
import { Text } from "./Text";

export function PackageInfoSelector({
  options,
  placeholder = "Select an option...",
  value,
  onChange,
}: {
  placeholder?: string;
  options: PackageInfo[];
  value: any;
  onChange: (value: any) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          disabled={options.length === 0}
          className="w-full justify-between"
        >
          { 
          options.find((framework) => framework.objectId === value)?.display.name ||
          placeholder }
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] max-h-[350px] overflow-y-auto p-Large">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-Small">
          <Text variant="small/semibold" className="lg:col-span-2">Select a package</Text>
          {
            options.map((option) => (
              <div 
                className="border-4 rounded-lg border-border-classic hover:border-opacity-100 ease-in-out duration-300 hover:border-primary cursor-pointer" 
                onClick={() => {
                  onChange(option.objectId);
                  setOpen(false);
                }}>
                <PackageInfoDisplay width="100%" height="auto" {...option.display} packageAddr={option.packageAddress} />
              </div>
            ))
          }
          </div>
      </PopoverContent>
    </Popover>
  );
}
