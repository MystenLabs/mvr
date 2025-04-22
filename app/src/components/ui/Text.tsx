import { cva, type VariantProps } from "class-variance-authority";
import { type ReactNode } from "react";

import { parseVariant, type SizeAndWeightVariant } from "./utils/sizeAndWeight";

const textStyles = cva(["break-words"], {
  variants: {
    kind: {
      default: "font-inter font-normal",
      paragraph: "font-inter",
      label: "font-inter font-medium",
      heading: "font-inter font-bold",
      display: "font-sans font-bold",
    },

    size: {
      "paragraph-regular": "text-14 leading-20 lg:text-16 lg:leading-24",
      "paragraph-large": "text-16 leading-24 lg:text-18 lg:leading-28",
      "paragraph-small": "text-12 leading-16 lg:text-14 lg:leading-20",
      "paragraph-xs": "text-10 leading-12 lg:text-12 lg:leading-16",
      "paragraph-xl": "text-18 leading-24 lg:text-24 lg:leading-32",

      "label-regular": "text-14 leading-16 lg:text-16 lg:leading-20",
      "label-large": "text-16 leading-18 lg:text-18 lg:leading-24",
      "label-small": "text-12 leading-14 lg:text-14 lg:leading-16",
      "label-xs": "text-10 leading-12 lg:text-12 lg:leading-14",
      "label-2xs": "text-9 leading-11 lg:text-10 lg:leading-12",

      "heading-regular": "text-20 leading-28 lg:text-28 lg:leading-36",
      "heading-large": "text-24 leading-32 lg:text-32 lg:leading-40",
      "heading-xlarge": "text-32 leading-40 lg:text-36 lg:leading-44",
      "heading-xxlarge": "text-40 leading-52 lg:text-40 lg:leading-52",
      "heading-small": "text-20 leading-28 lg:text-24 lg:leading-32",
      "heading-xs": "text-16 leading-24 lg:text-20 lg:leading-28",
      "heading-2xs": "text-12 leading-16 lg:text-16 lg:leading-24",
      "heading-3xs": "text-11 leading-13 lg:text-14 lg:leading-20",
      "heading-headline": "text-10 leading-14 tracking-five lg:text-12 lg:leading-16 lg:tracking-five",

      "display-xxs": "text-30 leading-36 -tracking-three",
      "display-xs": "text-36 leading-48 -tracking-three",

      "display-small": "text-36 leading-48 -tracking-three lg:text-44 lg:leading-56",
      "display-regular": "text-44 leading-56 -tracking-three lg:text-52 lg:leading-64",
      "display-large": "text-64 leading-80 -tracking-three lg:text-96 lg:leading-112",
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
