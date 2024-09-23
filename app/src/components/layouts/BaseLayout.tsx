"use client";

import { useEffect, useState } from "react";
import { MVRContext, MVRSetup } from "../providers/mvr-provider";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import Header from "../Header";
import Footer from "../Footer";
import { LocalStorageKeys } from "@/data/localStorage";
import { BaseContent } from "./BaseContent";
import { Toaster } from 'sonner'

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
      <div className="min-h-screen flex flex-col">
        <Toaster />
        <Header updateUseCustomAddress={updateUseCustomAddress} updateCustomAddress={updateCustomAddress} />
        <BaseContent>{children}</BaseContent>
        <Footer />
      </div>

    </MVRContext.Provider>
  );
}
