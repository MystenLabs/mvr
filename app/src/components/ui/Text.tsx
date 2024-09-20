import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";

import { parseVariant, type SizeAndWeightVariant } from "./utils/sizeAndWeight";

const textStyles = cva(["break-words"], {
  variants: {
    size: {
      xxsmall: 'text-2xs',
      xsmall: 'text-xs',
      small: 'text-sm',
      regular: 'text-base',
      display: 'text-DSmall leading-tight',
      heading: 'text-HSmall',
    },
    weight: {
      medium: "font-medium",
      regular: "font-normal",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    color: {
      primary: 'text-primary',
      regular: "text-content-primary",
      tertiary: "text-content-tertiary",
      negative: "text-negative",
      success: 'text-positive',
      secondary: "text-content-secondary",
    },
    family: {
      sans: "font-sans",
      mono: "font-mono",
      inter: "font-inter",
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
    size: "regular",
    color: "regular",
    weight: "regular",
    family: 'sans'
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
  variant,
  family,
  ...styleProps
}: TextProps) {
  const [size, weight] = parseVariant<TextStylesProps>(variant);
  return (
    <div
      className={textStyles({ color, size, weight, className, family, ...styleProps })}
    >
      {children}
    </div>
  );
}
