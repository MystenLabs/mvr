import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";

import { parseVariant, type SizeAndWeightVariant } from "./utils/sizeAndWeight";

const textStyles = cva(["break-words"], {
  variants: {
    kind: {
      default: "font-inter",
      paragraph: "font-inter",
      label: "font-inter font-medium",
      heading: "font-inter font-bold",
      display: "font-sans font-bold",
    },

    size: {
      "paragraph-regular": "text-16 leading-24",
      "paragraph-large": "text-18 leading-28",
      "paragraph-small": "text-14 leading-20",
      "paragraph-xs": "text-12 leading-16",

      "label-regular": "text-16 leading-20",
      "label-large": "text-18 leading-24",
      "label-small": "text-14 leading-16",
      "label-xs": "text-12 leading-14",

      "heading-regular": "text-28 leading-36",
      "heading-large": "text-32 leading-40",
      "heading-xlarge": "text-36 leading-44",
      "heading-xxlarge": "text-40 leading-52",
      "heading-small": "text-24 leading-32",
      "heading-xs": "text-20 leading-28",
      "heading-xxs": "text-16 leading-24",
      "heading-headline": "text-12 leading-16 tracking-five",

      "display-xxs": "text-30 leading-36 -tracking-three",
      "display-xs": "text-36 leading-48 -tracking-three",

      "display-small": "text-44 leading-56 -tracking-three",
      "display-regular": "text-52 leading-64 -tracking-three",
      "display-large": "text-96 leading-112 -tracking-three",
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
    size: "paragraph-regular",
    kind: "default",
  },
});

type TextStylesProps = VariantProps<typeof textStyles>;

export interface TextProps extends TextStylesProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function Text({
  children,
  className,
  size,
  kind,
  as: Component = "p",
  ...styleProps
}: TextProps) {
  return (
    <Component className={textStyles({ size, kind, className, ...styleProps })}>
      {children}
    </Component>
  );
}
