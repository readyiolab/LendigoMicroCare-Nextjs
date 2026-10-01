"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CalendarDatePickerProps {
  /** Current date value (YYYY-MM-DD string or Date) */
  date?: string | Date | null
  /** Called with YYYY-MM-DD, or "" when cleared */
  onSelect?: (value: string) => void
  placeholder?: string
  className?: string
}

export default function CalendarDatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  className,
}: CalendarDatePickerProps) {
  // Parse YYYY-MM-DD as local date to avoid UTC off-by-one
  const selectedDate = React.useMemo(() => {
    if (!date) return undefined
    if (date instanceof Date) return date
    const s = String(date)
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? undefined : d
  }, [date])

  const handleSelect = (newDate: Date | undefined) => {
    if (onSelect) {
      if (newDate) {
        const year = newDate.getFullYear()
        const month = String(newDate.getMonth() + 1).padStart(2, "0")
        const day = String(newDate.getDate()).padStart(2, "0")
        onSelect(`${year}-${month}-${day}`)
      } else {
        onSelect("")
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full h-10 justify-start text-left font-medium rounded-md border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all",
            !date && "text-slate-400",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span className="text-[11px] uppercase tracking-wider">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border border-slate-100 shadow-2xl rounded-lg overflow-hidden"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          autoFocus
          className="rounded-none border-none p-3"
        />
      </PopoverContent>
    </Popover>
  )
}
