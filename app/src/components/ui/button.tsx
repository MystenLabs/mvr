import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ReloadIcon } from '@radix-ui/react-icons'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-content-primary hover:bg-primary-hover",
        outline:
          "border border-border-classic bg-transparent hover:bg-border-classic hover:text-content-primary",
        link: "text-content-primary underline-offset-4 hover:underline",
        secondary: 'bg-background-secondary text-white hover:bg-secondary-hover',
        header: 'bg-background-secondary text-white border border-border-classic',
        tertiary: 'bg-background-tertiary text-white hover:bg-secondary-hover',
        'outline-hover': 'border border-transparent hover:bg-secondary-hover',

        custom: 'bg-transparent text-content-primary',
      },
      size: {
        default: "h-8 px-5 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-9 px-8",
        icon: "h-8 w-9",
        header: "px-Regular py-XSmall"
      },
      round: {
        default: 'rounded-full',
        md: 'rounded-md',
        lg: 'rounded-lg',
        none: 'rounded-none'
      }
    },
    defaultVariants: {
      variant: "default",
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
