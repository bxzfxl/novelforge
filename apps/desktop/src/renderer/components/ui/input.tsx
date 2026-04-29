import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded px-3 py-1 text-[14px] text-[rgb(55,53,47)] bg-[rgba(55,53,47,0.04)] border border-transparent transition-colors placeholder:text-[rgba(55,53,47,0.28)] focus-visible:outline-none focus-visible:bg-white focus-visible:border-[rgba(55,53,47,0.2)] focus-visible:ring-2 focus-visible:ring-[var(--color-nf-accent)]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
