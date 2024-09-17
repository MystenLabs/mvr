"use client";

import { useEffect, useState } from "react";
import { MVRContext, MVRSetup } from "../providers/mvr-provider";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import Header from "../Header";
import Footer from "../Footer";

export function BaseLayout({ children }: { children: React.ReactNode }) {
  const [mvrSetup, setMVRSetup] = useState<MVRSetup>({
    isMultisig: false,
    multisigAddress: undefined,
    mainnetClient: new SuiClient({
      url: getFullnodeUrl("mainnet"),
    }),
  });

  const updateMVRSetup = (setup: MVRSetup) => {
    setMVRSetup(setup);
    localStorage.setItem("mvr-setup", JSON.stringify(setup));
  };

  // init multisig setup from local storage.
  useEffect(() => {
    const setup = localStorage.getItem("mvr-setup");
    if (setup) {
      setMVRSetup(JSON.parse(setup));
    }
  }, []);

  return (
    <MVRContext.Provider value={mvrSetup}>
      <Header />
      {children}
      <Footer />
    </MVRContext.Provider>
  );
}
