import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "rounded-md border-stroke-secondary disabled:bg-bg-quarternaryBleedthrough disabled:border-bg-quarternaryBleedthrough flex h-9 w-full border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-sm placeholder:text-content-primary placeholder:opacity-15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed",
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
