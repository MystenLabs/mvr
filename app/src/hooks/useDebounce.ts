import { useState, useEffect } from "react";

export function useDebounce<T>(
  value: T,
  delay: number = 300,
): { value: T; isDebouncing: boolean } {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    setIsDebouncing(true);
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
      setIsDebouncing(false);
    };
  }, [value, delay]);

  return {
    value: debouncedValue,
    isDebouncing: isDebouncing,
  };
}
