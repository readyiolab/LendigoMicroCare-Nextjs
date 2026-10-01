"use client"

import React from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

type SearchInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  loading?: boolean
  containerClassName?: string
}

/**
 * Search input with built-in loading state and clear button.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      loading,
      placeholder = "Search...",
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative group w-full", containerClassName)}>
        <Search
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300",
            loading ? "text-indigo-500" : "text-slate-400 group-focus-within:text-indigo-600"
          )}
        />

        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "pl-11 pr-11 h-12 w-full rounded-lg border-slate-100 bg-slate-50/50 text-sm font-medium",
            "placeholder:text-slate-400 placeholder:font-normal",
            "focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 focus:bg-white",
            "transition-all duration-300 outline-none shadow-sm group-hover:shadow-md group-hover:border-slate-200",
            className
          )}
          {...props}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          ) : (
            value && (
              <button
                onClick={() => {
                  onChange?.("")
                  onClear?.()
                }}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>

        {/* Subtle glow effect on focus */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-0 group-focus-within:opacity-5 transition-opacity duration-500 pointer-events-none" />
      </div>
    )
  }
)

SearchInput.displayName = "SearchInput"
