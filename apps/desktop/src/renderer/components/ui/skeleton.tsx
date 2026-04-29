import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded bg-[rgba(55,53,47,0.06)]", className)} {...props} />
}

export { Skeleton }
