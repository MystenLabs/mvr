"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
    thumbClassName?: string;
    childrenClassName?: string;
  }
>(
  (
    { className, thumbClassName, children, childrenClassName, ...props },
    ref,
  ) => (
    <SwitchPrimitives.Root
      className={cn(
        "focus-visible:ring-neutral-950 focus-visible:ring-offset-white data-[state=checked]:bg-positive data-[state=unchecked]:bg-secondary-hover focus-visible:ring-neutral-300 peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      ref={ref}
    >
      {children && (
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full w-full items-center",
            childrenClassName,
          )}
        >
          {children}
        </div>
      )}
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-[#fff] shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[180%] data-[state=unchecked]:translate-x-0",
          thumbClassName,
        )}
      ></SwitchPrimitives.Thumb>
    </SwitchPrimitives.Root>
  ),
);
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
