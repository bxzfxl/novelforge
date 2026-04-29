import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-[14px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-nf-accent)]/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-[var(--color-nf-accent)] text-white hover:bg-[var(--color-nf-accent-hover)] active:scale-[0.9]",
        destructive: "bg-[var(--color-nf-red)] text-white hover:bg-[#c53030] active:scale-[0.9]",
        outline:     "border border-[rgba(55,53,47,0.2)] bg-transparent text-[rgb(55,53,47)] hover:bg-[rgba(55,53,47,0.04)]",
        secondary:   "bg-[rgba(55,53,47,0.06)] text-[rgb(55,53,47)] hover:bg-[rgba(55,53,47,0.1)] active:scale-[0.9]",
        ghost:       "bg-transparent text-[rgba(55,53,47,0.65)] hover:bg-[rgba(55,53,47,0.04)] hover:text-[rgb(55,53,47)]",
        link:        "bg-transparent text-[var(--color-nf-accent)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-8 px-3.5 py-1.5",
        sm:      "h-7 px-3 text-[13px]",
        lg:      "h-10 px-5 text-[15px]",
        icon:    "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
