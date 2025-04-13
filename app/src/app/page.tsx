"use client";

import Header from "@/components/Header";
import { DocsCTA } from "@/components/homepage/DocsCTA";
import { Text } from "@/components/ui/Text";
import { Content } from "@/data/content";
import GlowBottomPart from "@/icons/GlowBottomPart";
import GlowTopPart from "@/icons/GlowTopPart";
import MvrLogo from "@/icons/MvrLogo";
import { redirect } from "next/navigation";

export default function HomePage() {
  return (
    <>
      <Header showSearch={false} />

      <div className="relative flex-grow pt-4xl">
        <div className="z-0 opacity-50">
          <GlowTopPart className="absolute left-0 top-0 h-full w-full" />
          <GlowBottomPart className="absolute bottom-0 left-0 h-full w-full" />
        </div>

        <div className="relative grid grid-cols-1 gap-4xl">
          {/* Search section */}
          <div className="mx-auto grid grid-cols-1 gap-sm lg:max-w-[800px]">
            <MvrLogo className="mx-auto" width={54} height={66} />
            <Text kind="display" size="display-regular" className="text-center">
              {Content.homepage.title}
            </Text>
            <Text
              kind="paragraph"
              size="paragraph-xl"
              className="text-center text-content-secondary"
            >
              {Content.homepage.content}
            </Text>
          </div>

          {/* Docs Section */}
          <DocsCTA />
        </div>
      </div>
    </>
  );
}
