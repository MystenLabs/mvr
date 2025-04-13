"use client";

import Header from "@/components/Header";
import { DocsCTA } from "@/components/homepage/DocsCTA";
import GlowBottomPart from "@/icons/GlowBottomPart";
import GlowTopPart from "@/icons/GlowTopPart";
import { HomeSearchSection } from "@/components/homepage/HomeSearchSection";
import { ShareOnMVR } from "@/components/homepage/ShareOnMVR";
import { EnhanceYourPTBs } from "@/components/homepage/EnhanceYourPTBs";

export default function HomePage() {
  return (
    <>
      <Header showSearch={false} />

      <div className="relative flex-grow py-4xl">
        <div className="z-0 opacity-50">
          <GlowTopPart className="absolute left-0 top-0 h-full w-full" />
          <GlowBottomPart className="absolute bottom-0 left-0 h-full w-full" />
        </div>

        <div className="container relative grid grid-cols-1 gap-4xl">
          <HomeSearchSection>
            <>{/* Search bar goes here! */}</>
          </HomeSearchSection>

          <DocsCTA />

          <ShareOnMVR />

          <hr className="border-stroke-secondary" />

          <EnhanceYourPTBs />
        </div>
      </div>
    </>
  );
}
