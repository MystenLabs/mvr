"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp, XCircleIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Text } from "./Text";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PackageInfoData } from "@/utils/types";

export function PackageInfoSelector({
  options,
  placeholder = "Select an option...",
  value,
  onChange,
  disabled = false,
  disableClear = false,
}: {
  disabled?: boolean;
  placeholder?: string;
  options: PackageInfoData[];
  value: any;
  disableClear?: boolean;
  onChange: (value: any) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedValue = useMemo(() => {
    return options.find((framework) => framework.objectId === value);
  }, [value]);

  return (
    <div className="flex items-center gap-sm">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || options.length === 0}
            className="h-[45px] w-full justify-between overflow-hidden rounded-sm pr-2 text-sm font-normal"
          >
            <div className="flex items-center gap-sm overflow-ellipsis max-w-[85%]">
              {selectedValue && (
                <img
                  src={selectedValue?.suiDisplay?.imageUrl}
                  className="h-8 w-8 rounded-sm"
                />
              )}
              <p className="text-ellipsis overflow-hidden"> {selectedValue?.display.name || placeholder}</p>
            </div>

            {open ? (
              <ChevronUp className="h-4 w-4 shrink-0 opacity-50" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-[350px] w-full max-w-[80vw] overflow-y-auto p-sm max-md:mx-auto md:max-w-[550px]">
          <div className="grid grid-cols-2 gap-xs md:grid-cols-3">
            <Text
              kind="heading"
              size="heading-headline"
              className="col-span-2 mb-xs pb-sm md:col-span-3"
            >
              Select a metadata object
            </Text>
            {options.map((option) => (
              <div
                key={option.objectId}
                className={cn(
                  "cursor-pointer rounded-lg duration-300 ease-in-out hover:border-primary hover:border-opacity-100",
                  option.objectId === selectedValue?.objectId &&
                    "border-primary",
                )}
                onClick={() => {
                  onChange(option.objectId);
                  setOpen(false);
                }}
              >
                <img src={option.suiDisplay?.imageUrl} />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {!disableClear && value && !disabled && (
        <Button
          type="button"
          variant="outline-hover"
          className="px-2"
          onClick={() => {
            onChange(null);
          }}
        >
          <XIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
