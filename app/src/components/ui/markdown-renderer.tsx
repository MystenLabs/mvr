import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ node, ...props }) => (
          <p
            className="leading-20 lg:leading-24 text-14 text-content-secondary lg:text-16"
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
  );
}
