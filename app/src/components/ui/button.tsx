import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ReloadIcon } from '@radix-ui/react-icons'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center whitespace-nowrap text-sm font-medium ease-in-out duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none hover:opacity-[72%] disabled:opacity-[40%]",
  {
    variants: {
      variant: {
        primary: "bg-bg-accent text-content-primaryInverse ",
        secondary: "bg-bg-quarternaryBleedthrough text-content-primary",
        tertiary: "bg-transparent text-content-accent",

        // accent: "bg-b",

        primaryBtnGradient: "bg-primaryBtnGradient",

        outline:
          "border border-stroke-secondary bg-transparent hover:bg-bg-primaryBleedthrough hover:text-content-secondary",

        link: "text-content-secondary underline-offset-4 hover:text-content-accent",
        linkActive: 'text-content-accent',

        header: 'bg-background-secondary text-white border border-border-classic',
        'outline-hover': 'border border-transparent hover:bg-secondary-hover',

        custom: 'bg-transparent text-content-primary',
      },
      size: {
        fit: 'w-fit',
        auto: 'px-md py-sm',
        default: "h-8 px-md py-sm",
        xs: "h-6 px-2 text-12",
        sm: "h-7 px-3 text-xs",
        lg: "h-9 px-8",
        icon: "h-8 w-9",
        header: "px-sm py-xs lg:px-md lg:py-sm"
      },
      round: {
        default: 'rounded-md',
        md: 'rounded-md',
        lg: 'rounded-lg',
        none: 'rounded-none'
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      round: "default"
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean,
  isLoading?: boolean,
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
          disabled={isLoading ? true : props.disabled}
        />
      )
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        disabled={isLoading ? true : props.disabled}
      >
        {isLoading && <ReloadIcon className="mr-2 h-3 w-3 animate-spin" />}
        {props.children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
