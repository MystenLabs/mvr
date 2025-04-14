import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
              className="leading-20 lg:leading-24 my-md font-sans text-14 text-content-secondary lg:text-16"
              {...props}
            />
          ),
          pre: ({ node, ...props }) => (
            <pre
              className="text-13 my-sm overflow-x-auto rounded-md bg-bg-secondary p-md !font-inter text-content-secondary"
              {...props}
            />
          ),
          code: ({ node, ...props }) => (
            <code className="bg-bg-secondary px-1 py-0.5 font-inter" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="list-inside list-disc text-14 text-content-secondary"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-inside list-decimal text-14 text-content-secondary"
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
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
