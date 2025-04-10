import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "rounded-md border-stroke-secondary disabled:bg-bg-quarternaryBleedthrough outline-bg-accentBleedthrough3 disabled:border-bg-quarternaryBleedthrough flex w-full border bg-transparent px-md py-sm text-sm shadow-sm transition-colors placeholder:text-sm placeholder:text-content-primary placeholder:opacity-15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
TextArea.displayName = "TextArea";

export { TextArea };
