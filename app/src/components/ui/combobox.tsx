"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ComboBox({
  options,
  placeholder = "Select an option...",
  emptyState = "No options found.",
  searchText = "Search...",
  showSearch = true,
  value,
  setValue,
}: {
  showSearch?: boolean;
  placeholder?: string;
  emptyState?: string;
  searchText?: string;
  options: { value: any; label: string, search?: string }[];
  value: any;
  setValue: (value: any) => void;
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
          {value
            ? options.find((framework) => framework.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command
          filter={(value, search) => {
            const valueLabel = options.find(
              (option) => option.value === value,
            )?.label;
            const valueSearch = options.find(
              (option) => option.value === value,
            )?.search;

            const labelMatch = valueLabel
              ?.toLowerCase()
              .includes(search.toLowerCase());
            const valueMatch = value
              ?.toLowerCase()
              .includes(search.toLowerCase());

            const searchMatch = valueSearch?.toLowerCase().includes(search.toLowerCase());

            return labelMatch || searchMatch || valueMatch ? 1 : 0;
          }}
        >
          {showSearch && <CommandInput placeholder={searchText} />}
          <CommandList className="overflow-y-auto">
            <CommandEmpty>{emptyState}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer"
                  onSelect={(currentValue) => {
                    if (value !== currentValue) setValue(currentValue);
                    setOpen(false);
                  }}
                >
                  {option.label}

                  <Check
                    className={cn(
                      "ml-Small h-4 w-4 rounded-full bg-positive p-0.5 text-primary-dark",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
