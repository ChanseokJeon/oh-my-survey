"use client"

import { useEffect, useCallback, useState } from "react"

/**
 * Hook to warn users about unsaved changes when leaving the page
 * @param hasChanges - Whether there are unsaved changes
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers ignore custom messages and show their own
      e.returnValue = ""
      return ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasChanges])
}

/**
 * Hook to track form dirty state by comparing current values to initial values
 * @param initialValues - Initial form values object
 * @returns Object with isDirty flag, setFieldValue function, and resetDirty function
 */
export function useFormDirty<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues)
  const [isDirty, setIsDirty] = useState(false)

  // Compare current values to initial values
  useEffect(() => {
    const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues)
    setIsDirty(hasChanges)
  }, [values, initialValues])

  const setFieldValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    []
  )

  const resetDirty = useCallback(() => {
    setValues(initialValues)
    setIsDirty(false)
  }, [initialValues])

  return {
    isDirty,
    values,
    setFieldValue,
    resetDirty,
  }
}
