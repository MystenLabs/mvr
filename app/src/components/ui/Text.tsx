import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";

import { parseVariant, type SizeAndWeightVariant } from "./utils/sizeAndWeight";

const textStyles = cva(["break-words"], {
  variants: {
    size: {
      B1: "text-body",
      BLarge: "text-bodyLarge leading-tight",
      B2: "text-bodySmall",
      P1: "text-paragraph",
      xs: "text-xs",
      sm: "text-sm",
      md: "text-md",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "5xl": "text-5xl",
    },
    weight: {
      medium: "font-medium",
      regular: "font-normal",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    color: {
      primary: "text-content-primary",
      tertiary: "text-fillContent-tertiary",
      "primary-darker": "text-fillContent-primary-darker",
      "primary-inactive": "text-fillContent-primary-inactive",
      orange: "text-fillContent-orange",
      secondary: "text-fillContent-secondary",
      "purple-light": "text-fillContent-purple-light",
      link: "text-fillContent-link",
      issue: "text-fillContent-issue",
    },
    truncate: {
      true: "truncate",
    },
    underline: {
      true: "underline",
    },
    mono: {
      true: "!font-mono",
      false: "font-sans",
    },
  },

  defaultVariants: {
    size: "B1",
    color: "primary",
    weight: "medium",
  },
});

type TextStylesProps = VariantProps<typeof textStyles>;

export interface TextProps extends Omit<TextStylesProps, "size" | "weight"> {
  children: ReactNode;
  className?: string;
  variant: SizeAndWeightVariant<TextStylesProps>;
}

export function Text({
  children,
  className,
  color,
  variant = "B1/medium",
  ...styleProps
}: TextProps) {
  const [size, weight] = parseVariant<TextStylesProps>(variant);
  return (
    <div
      className={textStyles({ color, size, weight, className, ...styleProps })}
    >
      {children}
    </div>
  );
}
