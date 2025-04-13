import { Content } from "@/data/content";
import { Text } from "../ui/Text";
import CodeRenderer from "./CodeRenderer";
import { MarkdownRenderer } from "../ui/markdown-renderer";

export function ShareOnMVR() {
  return (
    <div className="grid grid-cols-1 gap-2xl rounded-xl bg-homepageCard px-xl py-2xl">
      <div className="text-center">
        <Text
          as="h2"
          kind="heading"
          size="heading-small"
          className="text-content-accent"
        >
          {Content.homepage.share.title}
        </Text>
        <Text as="p" kind="paragraph" size="paragraph-regular">
          {Content.homepage.share.subtitle}
        </Text>
      </div>
      <hr className="border-stroke-secondary" />

      {Content.homepage.share.steps.map((step) => (
        <Step key={step.title} {...step} />
      ))}
    </div>
  );
}

const Step = ({
  title,
  description,
  code,
}: {
  title: string;
  description: string;
  code: string;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-sm items-center">
      <div>
        <Text as="h3" kind="heading" size="heading-xs">
          {title}
        </Text>
        <MarkdownRenderer markdown={description} />
      </div>
      <div className="w-full">
        <CodeRenderer code={code} language="bash" />
      </div>
    </div>
  );
};
