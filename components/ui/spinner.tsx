import * as React from "react"

import { cn } from "@/lib/utils"

function SpinnerBase({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        !className?.includes("h-") &&
          !className?.includes("w-") &&
          !className?.includes("size-") &&
          "h-12 w-12",
        className
      )}
      {...props}
    />
  )
}

function SpinnerFull({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center min-h-[400px] text-slate-400", className)}>
      <SpinnerBase className="text-slate-400" />
    </div>
  )
}

const Spinner = Object.assign(SpinnerBase, { Full: SpinnerFull })

export { Spinner }
