import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "focus-visible:ring-primary flex w-full rounded-md border border-stroke-secondary bg-transparent px-md py-sm text-sm shadow-sm outline-bg-accentBleedthrough3 transition-colors placeholder:text-sm placeholder:text-content-primary placeholder:opacity-15 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:border-bg-quarternaryBleedthrough disabled:bg-bg-quarternaryBleedthrough",
          hasError && "border-accent-red shadow-none outline-none !ring-0",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
