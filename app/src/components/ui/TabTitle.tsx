import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

const styles = cva(
  ["rounded-none py-lg capitalize duration-300 border-b-2 ease-in-out hover:opacity-100"], {
  variants: {
    active: {
        true: "border-bg-accent opacity-100",
        false: "border-transparent opacity-60",
    },
  },

  defaultVariants: {
    active: false,
  },
});

type TabStyleProps = VariantProps<typeof styles>;

export interface TabTitleProps extends TabStyleProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function TabTitle({
  children,
  className,
  ...styleProps
}: TabTitleProps & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={cn(styles(styleProps), className)} {...styleProps} variant="custom">
        {children}
    </Button>
  );
}
