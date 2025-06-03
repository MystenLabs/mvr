import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import CodeRenderer, {
  KnownLanguages,
  Language,
} from "../homepage/CodeRenderer";
import remarkGfm from "remark-gfm";
import { ReactNode } from "react";
import { HashIcon } from "lucide-react";

const getTitleAnchorId = (title: string | ReactNode) => {
  if (typeof title !== "string") return undefined;

  return title.toLowerCase().replace(/ /g, "-");
};

function MarkdownTitle({
  title,
  children,
}: {
  title: string | ReactNode;
  children: ReactNode;
}) {
  const anchorId = getTitleAnchorId(title);
  return (
    <div className="markdown-header relative">
      {anchorId && (
        <a
          href={`#${anchorId}`}
          className="header-anchor absolute top-[25%] w-[30px] text-content-secondary max-md:hidden md:-left-7"
        >
          <HashIcon className="h-4 w-4" />
        </a>
      )}
      {children}
    </div>
  );
}

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
            <MarkdownTitle title={props.children}>
              <h1
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-32 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
          ),
          h2: ({ node, ...props }) => (
            <MarkdownTitle title={props.children}>
              <h2
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-24 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
          ),
          h3: ({ node, ...props }) => (
            <MarkdownTitle title={props.children}>
              <h3
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-20 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
          ),
          h4: ({ node, ...props }) => (
            <MarkdownTitle title={props.children}>
              <h4
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-16 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
          ),
          h5: ({ node, ...props }) => (
            <MarkdownTitle title={props.children}>
              <h5
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-16 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
          ),
          h6: ({ node, ...props }) => (
            <MarkdownTitle title={props.children}>
              <h6
                id={getTitleAnchorId(props.children)}
                className="my-md font-sans text-12 font-bold text-content-primary"
                {...props}
              />
            </MarkdownTitle>
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
                language={
                  KnownLanguages.includes(language as Language)
                    ? (language as Language)
                    : "move"
                }
                wrapLines={false}
                wrapLongLines={false}
                className="lg:text-15 my-sm bg-bg-quarternaryBleedthrough2 text-14"
              />
            );
          },
          ul: ({ node, ...props }) => (
            <ul
              className="ml-sm list-inside list-disc text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="ml-sm list-inside list-decimal text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          img: ({ node }) => <span className="my-lg block" />,
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
