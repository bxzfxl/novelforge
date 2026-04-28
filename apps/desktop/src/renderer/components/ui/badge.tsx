import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#097fe8] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#f2f9ff] text-[#097fe8]",
        secondary: "border-transparent bg-[rgba(0,0,0,0.05)] text-nf-muted",
        destructive: "border-transparent bg-red-50 text-red-600",
        outline: "text-nf-muted border-[rgba(0,0,0,0.15)]",
        success: "border-transparent bg-green-50 text-green-700",
        warning: "border-transparent bg-amber-50 text-amber-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
