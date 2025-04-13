import { Content } from "@/data/content";
import { Text } from "../ui/Text";
import CodeRenderer from "./CodeRenderer";
import { MarkdownRenderer } from "../ui/markdown-renderer";
import { motion } from "framer-motion";

export function ShareOnMVR() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      className="grid grid-cols-1 gap-2xl rounded-xl bg-homepageCard px-xl py-2xl"
    >
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

      {Content.homepage.share.steps.map((step, index) => (
        <Step key={step.title} {...step} index={index} />
      ))}
    </motion.div>
  );
}

const Step = ({
  title,
  description,
  code,
  index,
}: {
  title: string;
  description: string;
  code: string;
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: index * 0.1 }}
      className="grid grid-cols-1 gap-sm items-center md:grid-cols-2"
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
    </motion.div>
  );
};
