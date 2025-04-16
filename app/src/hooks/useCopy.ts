import { useState } from "react";
import { toast } from "sonner";

export const useCopy = (text: string) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard", {
      duration: 1000,
      position: "bottom-center",
    });
    setTimeout(() => setCopied(false), 1500);
  };

  return { copied, copy };
};
