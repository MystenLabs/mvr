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
        a: ({ node, ...props }) => (
          <a
            className="text-content-accent underline underline-offset-4 hover:opacity-80"
            {...props}
          />
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
