// CodeRenderer.tsx
import { CheckIcon, CopyIcon } from "lucide-react";
import React, { useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import { dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Button } from "../ui/button";
import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("typescript", typescript);

export type Language = "bash" | "typescript";

const CodeRenderer = ({
  code,
  language,
  enableCopy = true,
  className,
}: {
  code: string;
  language: Language;
  enableCopy?: boolean;
  className?: string;
}) => {
  const { copied, copy } = useCopy(code);

  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-xs rounded-sm bg-bg-primaryBleedthrough2 px-sm py-xs",
        className,
      )}
    >
      <SyntaxHighlighter
        className="synta w-full !bg-transparent !font-mono"
        language={language}
        style={dark}
        wrapLines
        wrapLongLines
        codeTagProps={{ className: "!font-sans" }}
      >
        {code}
      </SyntaxHighlighter>

      {enableCopy && (
        <Button variant="link" size="icon" onClick={copy}>
          {copied ? (
            <CheckIcon className="h-3 w-3" />
          ) : (
            <CopyIcon className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
};

export default CodeRenderer;
