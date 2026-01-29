import * as React from "react"

import { cn } from "@/lib/utils"

interface InputWithCounterProps extends React.ComponentProps<"input"> {
  maxLength: number
  showCount?: boolean
  warnAt?: number
}

const InputWithCounter = React.forwardRef<HTMLInputElement, InputWithCounterProps>(
  ({ className, maxLength, showCount = true, warnAt = 0.9, ...props }, ref) => {
    const [length, setLength] = React.useState(0)

    // Sync length with initial value
    React.useEffect(() => {
      if (props.value !== undefined) {
        setLength(String(props.value).length)
      }
    }, [props.value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLength(e.target.value.length)
      props.onChange?.(e)
    }

    const getCounterColor = () => {
      if (length >= maxLength) return "text-red-600"
      if (length >= maxLength * warnAt) return "text-yellow-600"
      return "text-muted-foreground"
    }

    return (
      <div className="w-full">
        <input
          type="text"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        {showCount && (
          <div className={cn("mt-1 text-xs text-right", getCounterColor())}>
            {length} / {maxLength}
          </div>
        )}
      </div>
    )
  }
)
InputWithCounter.displayName = "InputWithCounter"

interface TextareaWithCounterProps extends React.ComponentProps<"textarea"> {
  maxLength: number
  showCount?: boolean
  warnAt?: number
}

const TextareaWithCounter = React.forwardRef<HTMLTextAreaElement, TextareaWithCounterProps>(
  ({ className, maxLength, showCount = true, warnAt = 0.9, ...props }, ref) => {
    const [length, setLength] = React.useState(0)

    // Sync length with initial value
    React.useEffect(() => {
      if (props.value !== undefined) {
        setLength(String(props.value).length)
      }
    }, [props.value])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLength(e.target.value.length)
      props.onChange?.(e)
    }

    const getCounterColor = () => {
      if (length >= maxLength) return "text-red-600"
      if (length >= maxLength * warnAt) return "text-yellow-600"
      return "text-muted-foreground"
    }

    return (
      <div className="w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          maxLength={maxLength}
          onChange={handleChange}
          {...props}
        />
        {showCount && (
          <div className={cn("mt-1 text-xs text-right", getCounterColor())}>
            {length} / {maxLength}
          </div>
        )}
      </div>
    )
  }
)
TextareaWithCounter.displayName = "TextareaWithCounter"

export { InputWithCounter, TextareaWithCounter }
