import * as React from "react"
import { Field, FieldLabel, FieldContent } from "./field"

type FieldWrapperProps = React.ComponentProps<typeof Field> & {
  label?: React.ReactNode
  required?: boolean
}

export function FieldWrapper({ label, required, children, ...props }: FieldWrapperProps) {
  return (
    <Field {...props}>
      {label && (
        <FieldLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FieldLabel>
      )}
      <FieldContent>{children}</FieldContent>
    </Field>
  )
}
