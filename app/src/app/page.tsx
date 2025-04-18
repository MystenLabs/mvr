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
import { FadeInUpDiv } from "@/components/animations/FadeInUpDiv";
import { useIsFocused } from "@/hooks/useIsFocused";

export default function HomePage() {
  const { isFocused, handleFocus, handleBlur } = useIsFocused();

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
        <div className="relative grid grid-cols-1 gap-4xl py-4xl max-sm:px-sm">
          <HomeSearchSection isInputFocused={isFocused}>
            <HomeSearchBar
              isDebouncing={isDebouncing}
              isLoading={isLoading}
              searchQuery={searchQuery}
              handleFocus={handleFocus}
              handleBlur={handleBlur}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              isInputFocused={isFocused}
              className="z-30"
            />
          </HomeSearchSection>

          <DocsCTA />

          <ShareOnMVR />

          <FadeInUpDiv className="container">
            <hr className="border-stroke-secondary" />
          </FadeInUpDiv>

          <EnhanceYourPTBs />
        </div>
      </div>
    </>
  );
}
