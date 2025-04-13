import { Content } from "@/data/content";
import { Text } from "../ui/Text";
import { TabTitle } from "../ui/TabTitle";
import { useState } from "react";
import CodeRenderer, { Language } from "./CodeRenderer";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";

const Tabs = [
  {
    title: Content.homepage.ptbs.typescript.tabTitle,
    key: "typescript",
  },
  {
    title: Content.homepage.ptbs.cli.tabTitle,
    key: "cli",
  },
];

export function EnhanceYourPTBs() {
  const [activeTab, setActiveTab] = useState(Tabs[0]!.key);
  const [toggleMvr, setToggleMvr] = useState(true);

  return (
    <div>
      <div className="pb-xl max-md:text-center">
        <Text
          as="h2"
          kind="heading"
          size="heading-small"
          className="text-content-accent"
        >
          {Content.homepage.ptbs.title}
        </Text>
        <Text as="p" kind="paragraph" size="paragraph-regular">
          {Content.homepage.ptbs.subtitle}
        </Text>
      </div>

      <div className="flex items-center justify-between gap-md">
        <div className="flex gap-md">
          {Tabs.map((tab) => (
            <TabTitle
              key={tab.key}
              disabled={activeTab !== tab.key}
              onClick={() => {
                setActiveTab(tab.key);
              }}
            >
              <Text
                kind="paragraph"
                size="paragraph-large"
                className="flex flex-shrink-0 items-center gap-sm"
              >
                {tab.title}
              </Text>
            </TabTitle>
          ))}
        </div>
        <Switch
          className="data-[state=checked]:bg-purpleBlue h-[28px] w-[70px] bg-bg-quarternaryBleedthrough"
          thumbClassName="h-[26px] w-[26px] data-[state=checked]:translate-x-11"
          childrenClassName={cn(
            toggleMvr &&
              "text-content-primaryInverse justify-start left-0 right-auto ml-xs",
            !toggleMvr && "opacity-0",
          )}
          checked={toggleMvr}
          onCheckedChange={() => setToggleMvr(!toggleMvr)}
        >
          <Text as="p" kind="label" size="label-small">
            MVR
          </Text>
        </Switch>
      </div>

      <div className="grid grid-cols-1 gap-xl pt-2xl">
        {activeTab === "typescript" && (
          <>
            <RenderCodeBlock
              {...Content.homepage.ptbs.typescript.setup}
              language="typescript"
              lowOpacity={!toggleMvr}
              enableCopy={toggleMvr}
            />
            <RenderCodeBlock
              {...(toggleMvr
                ? Content.homepage.ptbs.typescript.withMvr
                : Content.homepage.ptbs.typescript.withoutMvr)}
              language="typescript"
              enableCopy={toggleMvr}
            />
          </>
        )}

        {activeTab === "cli" && (
          <>
            <RenderCodeBlock
              {...(toggleMvr
                ? Content.homepage.ptbs.cli.after
                : Content.homepage.ptbs.cli.before)}
              language="bash"
              enableCopy={toggleMvr}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RenderCodeBlock({
  title,
  subtitle,
  code,
  language,
  lowOpacity,
  enableCopy,
}: {
  title: string;
  subtitle?: string;
  code: string;
  language: Language;
  lowOpacity?: boolean;
  enableCopy?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-sm md:grid-cols-12",
        lowOpacity && "opacity-20",
      )}
    >
      <div className="col-span-12 md:col-span-4 lg:col-span-3">
        <Text as="h3" kind="heading" size="heading-xs">
          {title}
        </Text>
        {subtitle && (
          <Text as="p" kind="paragraph" size="paragraph-regular">
            {subtitle}
          </Text>
        )}
      </div>
      <div className="col-span-12 md:col-span-8 lg:col-span-9">
        <CodeRenderer
          code={code}
          language={language}
          enableCopy={enableCopy}
          className="bg-bluePurpleOp9"
        />
      </div>
    </div>
  );
}
