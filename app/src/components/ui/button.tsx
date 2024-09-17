import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ReloadIcon } from '@radix-ui/react-icons'

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center rounded-full whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-content-primary hover:bg-primary-hover",
        outline:
          "border border-primary bg-transparent hover:bg-primary hover:text-content-primary",
        link: "text-content-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-5 py-2",
        sm: "h-7 px-3 text-xs",
        lg: "h-9 px-8",
        icon: "h-8 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
          disabled={isLoading || props.disabled}
          {...props}
        />
      )
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <ReloadIcon className="mr-2 h-3 w-3 animate-spin" />}
        {props.children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
