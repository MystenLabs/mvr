import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const styles = cva(
  [
    "rounded-none py-lg pb-lg !px-0 capitalize duration-300 border-b-2 ease-in-out hover:opacity-100 text-20 leading-28 font-bold",
  ],
  {
    variants: {
      disabled: {
        false: "border-bg-accent opacity-100",
        true: "border-transparent opacity-60",
      },
    },

    defaultVariants: {
      disabled: false,
    },
  },
);

type TabStyleProps = VariantProps<typeof styles>;

export interface TabTitleProps extends TabStyleProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabTitle({
  children,
  className,
  ...styleProps
}: TabTitleProps & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      className={cn(styles(styleProps), className, "px-0")}
      {...styleProps}
      variant="custom"
    >
      {children}
    </Button>
  );
}
