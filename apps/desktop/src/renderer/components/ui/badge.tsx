import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[rgba(0,117,222,0.1)] text-[var(--color-nf-accent)]",
        secondary:   "bg-[rgba(55,53,47,0.06)] text-[rgba(55,53,47,0.6)]",
        destructive: "bg-[rgba(224,62,62,0.1)] text-[var(--color-nf-red)]",
        outline:     "border border-[rgba(55,53,47,0.2)] text-[rgba(55,53,47,0.55)]",
        success:     "bg-[rgba(15,123,108,0.1)] text-[var(--color-nf-green)]",
        warning:     "bg-[rgba(217,115,13,0.1)] text-[var(--color-nf-orange)]",
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
