"use client";

import { WalletConnectedContent } from "@/components/layouts/WalletConnectedContent";
import {
  AppContext,
  AppContextType,
} from "@/components/providers/app-provider";
import { ComboBox } from "@/components/ui/combobox";
import { PublicNameLabel } from "@/components/ui/public-name-label";
import { Text } from "@/components/ui/Text";
import { LocalStorageKeys } from "@/data/localStorage";
import {
  formatNamesForComboBox,
  useOrganizationList,
} from "@/hooks/useOrganizationList";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export default function AppsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { names: ownedNames } = useOrganizationList();

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

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName =
      ownedNames?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setAppValue({ selectedSuinsName });
  };

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

  return (
    <WalletConnectedContent>
      <AppContext.Provider
        value={{ value: appValue, setValue: setAndCacheValue }}
      >
        {appValue.selectedSuinsName && (
          <div className="container flex items-center gap-Regular pb-Regular">
            <ComboBox
              placeholder="Select a name..."
              value={appValue.selectedSuinsName?.nftId}
              options={formatNamesForComboBox(ownedNames, <PublicNameLabel />)}
              setValue={selectSuinsName}
            />
          </div>
        )}
        {children}
      </AppContext.Provider>
    </WalletConnectedContent>
  );
}
