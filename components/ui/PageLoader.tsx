import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

interface PageLoaderProps {
  text?: string
  subtext?: string
  className?: string
  minHeight?: string
}

export function PageLoader({ text, subtext, className, minHeight = "min-h-[400px]" }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 animate-in fade-in duration-700",
        minHeight,
        className
      )}
    >
      <Spinner />
      {(text || subtext) && (
        <div className="space-y-1 text-center">
          {text && (
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">{text}</p>
          )}
          {subtext && (
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{subtext}</p>
          )}
        </div>
      )}
    </div>
  )
}
