"use client";

import { ChevronsUpDown, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PackageInfo } from "@/hooks/useGetPackageInfoObjects";
import { PackageInfoDisplay } from "@/icons/PackageInfoDisplay";
import { Text } from "./Text";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export function PackageInfoSelector({
  options,
  placeholder = "Select an option...",
  value,
  onChange,
  disabled = false,
}: {
  disabled?: boolean;
  placeholder?: string;
  options: PackageInfo[];
  value: any;
  onChange: (value: any) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedValue = useMemo(() => {
    return options.find((framework) => framework.objectId === value);
  }, [value]);

  return (
    <div className="flex gap-Small">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || options.length === 0}
            className="w-full justify-between font-normal text-sm"
          >
            {selectedValue?.display.name || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-[350px] w-full max-w-[80vw] max-md:mx-auto md:max-w-[550px] overflow-y-auto p-Small">
          <div className="grid grid-cols-2 gap-XSmall md:grid-cols-3 ">
            <Text variant="small/semibold" className="col-span-2 md:col-span-3 border-b border-border-classic pb-Small mb-XSmall">
              Select a package
            </Text>
            {options.map((option) => (
              <div
                key={option.objectId}
                className={cn(
                  "cursor-pointer rounded-lg border-4 border-border-classic duration-300 ease-in-out hover:border-primary hover:border-opacity-100",
                  option.objectId === selectedValue?.objectId &&
                    "border-primary",
                )}
                onClick={() => {
                  onChange(option.objectId);
                  setOpen(false);
                }}
              >
                <PackageInfoDisplay
                  width="100%"
                  height="100%"
                  {...option.display}
                  packageAddr={option.packageAddress}
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button type="button" variant="outline-hover" className="px-2" onClick={() =>{
          onChange(null);
        }}>
          <XCircleIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
