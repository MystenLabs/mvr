import { Content } from "@/data/content";
import { Text } from "../ui/Text";
import CodeRenderer from "./CodeRenderer";
import { MarkdownRenderer } from "../ui/markdown-renderer";
import { FadeInUpDiv } from "../animations/FadeInUpDiv";

export function ShareOnMVR() {
  return (
    <FadeInUpDiv className="container grid grid-cols-1 gap-2xl rounded-xl bg-homepageCard px-xl py-2xl">
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
    </FadeInUpDiv>
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
    <FadeInUpDiv
      className="grid grid-cols-1 items-center gap-lg md:grid-cols-2"
    >
      <div>
        <Text as="h3" kind="heading" size="heading-xs">
          {title}
        </Text>
        <MarkdownRenderer markdown={description} />
      </div>
      <div className="w-full">
        <CodeRenderer code={code} language="bash" />
      </div>
    </FadeInUpDiv>
  );
};
