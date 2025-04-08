"use client";

import { useEffect, useState } from "react";
import { MVRContext, MVRSetup } from "../providers/mvr-provider";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import Header from "../Header";
import Footer from "../Footer";
import { LocalStorageKeys } from "@/data/localStorage";
import { Toaster } from "sonner";

export function BaseLayout({ children }: { children: React.ReactNode }) {
  const [mvrSetup, setMVRSetup] = useState<MVRSetup>({
    isCustom: false,
    customAddress: undefined,
    mainnetClient: new SuiClient({
      url: getFullnodeUrl("mainnet"),
    }),
  });

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
      <div className="flex min-h-screen flex-col">
        <Toaster />
        <Header />
        {children}
        <Footer />
      </div>
    </MVRContext.Provider>
  );
}
