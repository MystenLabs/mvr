import { useState } from "react";

export function useIsFocused() {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => setIsFocused(true);

  const handleBlur = () => {
    // Timeout needed to allow dropdown click before it disappears
    setTimeout(() => setIsFocused(false), 100);
  };

  return { isFocused, handleFocus, handleBlur };
}
