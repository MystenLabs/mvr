import { Content } from "@/data/content";
import { Text } from "../ui/Text";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export function DocsCTA() {
  const router = useRouter();

  return (
    <div className="container relative overflow-hidden rounded-xl px-2xl py-2xl">
      <img
        src="/mvr-docs-bg.webp"
        alt="MVR Docs"
        className="pointer-events-none absolute inset-0 w-full select-none bg-cover object-cover object-right-bottom opacity-50 mix-blend-color-dodge"
      />
      <div className="bg-purpleSalmonOp12 absolute inset-0"></div>
      <div className="relative z-10 items-center justify-between gap-md max-md:grid max-md:grid-cols-1 md:flex">
        <div>
          <Text kind="display" size="display-xs">
            {Content.homepage.docs.title}
          </Text>
          <Text
            kind="paragraph"
            size="paragraph-xl"
            className="text-content-secondary"
          >
            {Content.homepage.docs.paragraph}
          </Text>
        </div>
        <div className="flex items-center gap-xs">
          <Button
            variant="secondary"
            size="header"
            onClick={() => router.push(Content.homepage.docs.registerUrl)}
          >
            {Content.homepage.docs.register}
          </Button>
          <Button
            size="header"
            onClick={() => window.open(Content.homepage.docs.docsUrl, "_blank")}
          >
            {Content.homepage.docs.viewDocs}
          </Button>
        </div>
      </div>
    </div>
  );
}
