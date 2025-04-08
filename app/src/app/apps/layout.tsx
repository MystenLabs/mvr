"use client";

import Header from "@/components/Header";
import { WalletConnectedContent } from "@/components/layouts/WalletConnectedContent";
import {
  AppContext,
  AppContextType,
} from "@/components/providers/app-provider";
import { LocalStorageKeys } from "@/data/localStorage";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { useOrganizationList } from "@/hooks/useOrganizationList";
import { useEffect, useState } from "react";

export default function AppsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { names: ownedNames } = useOrganizationList();
  const address = useActiveAddress();

  const [appValue, setAppValue] = useState<AppContextType["value"]>({
    selectedSuinsName: null,
  });

  useEffect(() => {
    const sessionStorageEntry =
      JSON.parse(
        sessionStorage.getItem(LocalStorageKeys.SELECTED_NS_NAME) ?? "{}",
      )?.selectedSuinsName ?? null;

    if (sessionStorageEntry) {
      setAppValue({ selectedSuinsName: sessionStorageEntry });
    }
  }, []);

  const setAndCacheValue = (value: AppContextType["value"]) => {
    sessionStorage.setItem(
      LocalStorageKeys.SELECTED_NS_NAME,
      JSON.stringify(value),
    );
    setAppValue(value);
  };

  useEffect(() => {
    if (
      !ownedNames?.find((x) => x.nftId === appValue.selectedSuinsName?.nftId) &&
      appValue.selectedSuinsName?.nftId
    ) {
      setAppValue({ selectedSuinsName: null });
    }
  }, [ownedNames]);

  // Reset selected SuiNS name if the user switches.
  useEffect(() => {
    if (address) {
      setAppValue({ selectedSuinsName: null });
    }
  }, [address]);

  return (
    <>
      <Header />
      <WalletConnectedContent>
        <AppContext.Provider
          value={{ value: appValue, setValue: setAndCacheValue }}
        >
          {children}
        </AppContext.Provider>
      </WalletConnectedContent>
    </>
  );
}
