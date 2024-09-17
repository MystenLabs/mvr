"use client";

import { useEffect, useState } from "react";
import { MVRContext, MVRSetup } from "../providers/mvr-provider";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import Header from "../Header";
import Footer from "../Footer";
import { LocalStorageKeys } from "@/data/localStorage";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { EmptyState } from "../EmptyState";
import { Content } from "@/data/content";
import { Button } from "../ui/button";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { BaseContent } from "./BaseContent";

export function BaseLayout({ children }: { children: React.ReactNode }) {
  const [mvrSetup, setMVRSetup] = useState<MVRSetup>({
    isCustom: false,
    customAddress: undefined,
    mainnetClient: new SuiClient({
      url: getFullnodeUrl("mainnet"),
    }),
  });

  const updateUseCustomAddress = (val: boolean) => {
    updateMVRSetup({ ...mvrSetup, isCustom: val });
  };

  const updateCustomAddress = (address: string) => {
    updateMVRSetup({ ...mvrSetup, customAddress: address });
  };

  const updateMVRSetup = (setup: MVRSetup) => {
    setMVRSetup(setup);
    localStorage.setItem(LocalStorageKeys.MVRSetup, JSON.stringify(setup));
  };

  // init multisig setup from local storage.
  useEffect(() => {
    const setup = localStorage.getItem(LocalStorageKeys.MVRSetup);
    if (setup) {
      setMVRSetup(JSON.parse(setup));
    }
  }, []);

  return (
    <MVRContext.Provider value={mvrSetup}>
      <Header updateUseCustomAddress={updateUseCustomAddress} updateCustomAddress={updateCustomAddress} />
      <BaseContent>{children}</BaseContent>
      <Footer />
    </MVRContext.Provider>
  );
}
