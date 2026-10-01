"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type DateLike = string | number | Date | null | undefined

interface DatePickerProps {
  value?: string | null
  onChange?: (event: { target: { value: string; name?: string } }) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  maxDate?: DateLike
  minDate?: DateLike
  name?: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  required,
  maxDate,
  minDate,
  name,
}: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedValue = e.target.value
    if (onChange) {
      onChange({ target: { value: selectedValue, name } })
    }
  }

  // Convert date objects to YYYY-MM-DD format for min/max
  const formatSafely = (dateVal: DateLike) => {
    if (!dateVal) return undefined
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return undefined
      return format(d, "yyyy-MM-dd")
    } catch {
      return undefined
    }
  }

  const minDateStr = formatSafely(minDate)
  const maxDateStr = formatSafely(maxDate)

  return (
    <div className="w-full relative">
      <div className="relative">
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="date"
          value={value || ""}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          min={minDateStr}
          max={maxDateStr}
          className={cn("pl-10 w-full h-10", className)}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}
