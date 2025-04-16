import React from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import typescript from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import { dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useCopy } from "@/hooks/useCopy";
import { cn } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("typescript", typescript);

export type Language = "bash" | "typescript";

const CodeRenderer = ({
  code,
  language,
  enableCopy = true,
  className,
  codeTagClassName,
  highlighterClassName,
  wrapLines = true,
  wrapLongLines = true,
}: {
  code: string;
  language: Language;
  enableCopy?: boolean;
  className?: string;
  codeTagClassName?: string;
  highlighterClassName?: string;
  wrapLines?: boolean;
  wrapLongLines?: boolean;
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
        className={cn(
          "w-full !bg-transparent !font-mono",
          highlighterClassName,
        )}
        language={language}
        style={dark}
        wrapLines={wrapLines}
        wrapLongLines={wrapLongLines}
        codeTagProps={{ className: cn("!font-sans", codeTagClassName) }}
      >
        {code}
      </SyntaxHighlighter>

      {enableCopy && <CopyBtn text={code} />}
    </div>
  );
};

export default CodeRenderer;
