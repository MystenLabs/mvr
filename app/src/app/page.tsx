"use client";

import Header from "@/components/Header";
import { DocsCTA } from "@/components/homepage/DocsCTA";
import GlowBottomPart from "@/icons/GlowBottomPart";
import GlowTopPart from "@/icons/GlowTopPart";
import { HomeSearchSection } from "@/components/homepage/HomeSearchSection";
import { ShareOnMVR } from "@/components/homepage/ShareOnMVR";
import { EnhanceYourPTBs } from "@/components/homepage/EnhanceYourPTBs";
import { HomeSearchBar } from "@/components/public/HomeSearchBar";
import { useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchMvrNames } from "@/hooks/mvrResolution";

export default function HomePage() {
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleFocus = () => setIsInputFocused(true);
  const handleBlur = () => {
    // Timeout needed to allow dropdown click before it disappears
    setTimeout(() => setIsInputFocused(false), 100);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const { value: debouncedSearch, isDebouncing } = useDebounce(
    searchQuery,
    400,
  );

  const { data: searchResults, isLoading } = useSearchMvrNames(debouncedSearch);

  return (
    <>
      <Header showSearch={false} />

      <div className="relative flex-grow">
        <div className="z-0 opacity-50">
          <GlowTopPart className="absolute left-0 top-0 h-full w-full" />
          <GlowBottomPart className="absolute bottom-0 left-0 h-full w-full" />
        </div>
        <div className="container relative grid grid-cols-1 gap-4xl py-4xl">
          <HomeSearchSection isInputFocused={isInputFocused}>
            <HomeSearchBar
              isDebouncing={isDebouncing}
              isLoading={isLoading}
              searchQuery={searchQuery}
              handleFocus={handleFocus}
              handleBlur={handleBlur}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isInputFocused={isInputFocused}
              className="z-30"
            />
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
