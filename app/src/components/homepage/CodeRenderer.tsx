import React from "react";

import { vscDarkPlus as dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { PrismLight as PrismLightHighlighter } from "react-syntax-highlighter";
import { cn } from "@/lib/utils";
import { CopyBtn } from "../ui/CopyBtn";

import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import move from "@/lib/prism-move";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";

PrismLightHighlighter.registerLanguage("bash", bash);
PrismLightHighlighter.registerLanguage("typescript", typescript);
PrismLightHighlighter.registerLanguage("toml", toml);
PrismLightHighlighter.registerLanguage("move", move);
PrismLightHighlighter.registerLanguage("json", json);

export type Language = "bash" | "typescript" | "move" | "toml";
export const KnownLanguages = [
  "bash",
  "typescript",
  "move",
  "toml",
] as Language[];

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
  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-xs rounded-sm bg-bg-primaryBleedthrough2 px-sm py-xs",
        className,
        language,
      )}
    >
      <PrismLightHighlighter
        className={cn(
          "w-full border-none !bg-transparent shadow-none",
          highlighterClassName,
        )}
        language={language}
        style={dark}
        wrapLines={wrapLines}
        wrapLongLines={wrapLongLines}
        PreTag={({ children, className, props }) => (
          <pre
            className={cn(
              "w-full overflow-x-auto border-none !bg-transparent shadow-none",
              className,
            )}
            {...props}
          >
            {children}
          </pre>
        )}
        codeTagProps={{
          className: codeTagClassName,
          style: {
            fontFamily:
              "SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
          },
        }}
      >
        {code}
      </PrismLightHighlighter>

      {enableCopy && <CopyBtn text={code} className="h-full" />}
    </div>
  );
};

export default CodeRenderer;
