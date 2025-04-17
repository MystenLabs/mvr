import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import CodeRenderer, { KnownLanguages, Language } from "../homepage/CodeRenderer";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({
  markdown,
  addGaps = false,
}: {
  markdown: string;
  addGaps?: boolean;
}) {
  return (
    <div className={cn({ "flex flex-col gap-sm": addGaps })}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="my-md font-sans text-32 font-bold text-content-primary"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="my-md font-sans text-24 font-bold text-content-primary"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="my-md font-sans text-20 font-bold text-content-primary"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="my-md font-sans text-16 font-bold text-content-primary"
              {...props}
            />
          ),
          h5: ({ node, ...props }) => (
            <h5
              className="my-md font-sans text-16 font-bold text-content-primary"
              {...props}
            />
          ),
          h6: ({ node, ...props }) => (
            <h6
              className="my-md font-sans text-12 font-bold text-content-primary"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="leading-20 lg:leading-24 my-md break-words font-sans text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          pre: ({ node, ...props }) => (
            <div className="my-xl">{props.children}</div>
          ),
          code: ({ node, ...props }) => {
            // We consider this a codeblock if:
            // 1. It has a class name (it'llbe the language)
            // 2. It has a newline in it.
            const isCodeBlock =
              props.className ||
              (typeof props.children === "string" &&
                props.children.includes("\n"));

            if (!isCodeBlock) {
              return (
                <code
                  className="rounded-xs bg-bg-accentBleedthrough3 px-1 py-0.5 font-inter text-content-primary"
                  {...props}
                />
              );
            }

            const language = props.className?.replace("language-", "");

            return (
              <CodeRenderer
                code={props.children as string}
                language={KnownLanguages.includes(language as Language) ? (language as Language) : "move"}
                className="bg-bg-quarternaryBleedthrough2 lg:text-15 my-sm text-14"
              />
            );
          },
          ul: ({ node, ...props }) => (
            <ul
              className="list-inside list-disc text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-inside list-decimal text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          a: ({ node, ...props }) => {
            const isExternal = props.href?.startsWith("http");
            return (
              <a
                className={cn(
                  "text-content-accent underline underline-offset-4 hover:opacity-80",
                )}
                target={isExternal ? "_blank" : undefined}
                {...props}
              />
            );
          },
          // remark plugins
          table({ children }) {
            return (
              <table className="my-sm w-full table-auto border border-stroke-secondary text-14 lg:text-16">
                {children}
              </table>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-bg-quarternaryBleedthrough">
                {children}
              </thead>
            );
          },
          tr({ children }) {
            return (
              <tr className="border-b border-stroke-secondary">{children}</tr>
            );
          },
          th({ children }) {
            return (
              <th className="border border-stroke-secondary px-sm py-xs text-left font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-stroke-secondary px-sm py-xs">
                {children}
              </td>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
