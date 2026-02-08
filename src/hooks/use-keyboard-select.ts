"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface UseKeyboardSelectOptions {
  itemCount: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  autoFocus?: boolean;
}

export function useKeyboardSelect({
  itemCount,
  selectedIndex,
  onSelect,
  autoFocus = true,
}: UseKeyboardSelectOptions) {
  const [focusedIndex, setFocusedIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0
  );
  const focusedIndexRef = useRef(focusedIndex);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // Sync focusedIndex when selectedIndex changes externally
  useEffect(() => {
    if (selectedIndex >= 0) {
      setFocusedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && itemRefs.current[focusedIndexRef.current]) {
      itemRefs.current[focusedIndexRef.current]?.focus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const moveFocus = useCallback(
    (newIndex: number) => {
      setFocusedIndex(newIndex);
      focusedIndexRef.current = newIndex;
      itemRefs.current[newIndex]?.focus();
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const current = focusedIndexRef.current;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          const nextIndex = (current + 1) % itemCount;
          moveFocus(nextIndex);
          break;
        }
        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault();
          const prevIndex = (current - 1 + itemCount) % itemCount;
          moveFocus(prevIndex);
          break;
        }
        case " ": {
          e.preventDefault();
          onSelect(focusedIndexRef.current);
          break;
        }
      }
    },
    [itemCount, moveFocus, onSelect]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLButtonElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === focusedIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
      "aria-checked": index === selectedIndex,
      role: "radio" as const,
    }),
    [focusedIndex, selectedIndex, handleKeyDown]
  );

  const containerProps = {
    role: "radiogroup" as const,
  };

  return {
    focusedIndex,
    getItemProps,
    containerProps,
  };
}
