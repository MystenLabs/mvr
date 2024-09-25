"use client";

import { NetworkMissmatch } from "@/components/NetworkMissmatch";
import {
  AppContext,
  AppContextType,
} from "@/components/providers/app-provider";
import { ComboBox } from "@/components/ui/combobox";
import { Text } from "@/components/ui/Text";
import { LocalStorageKeys } from "@/data/localStorage";
import {
  formatNamesForComboBox,
  useOwnedSuinsNames,
} from "@/hooks/useOwnedSuiNSNames";
import { useEffect, useState } from "react";

export default function AppsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: ownedNames } = useOwnedSuinsNames();
  console.log(JSON.parse(localStorage.getItem(LocalStorageKeys.SELECTED_NS_NAME) ?? '')?.selectedSuinsName);

  const [appValue, setAppValue] = useState<AppContextType["value"]>({
    selectedSuinsName: JSON.parse(localStorage.getItem(LocalStorageKeys.SELECTED_NS_NAME) ?? '')?.selectedSuinsName ?? null,
  });

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName =
      ownedNames?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setAppValue({ selectedSuinsName });
  };

  const setAndCacheValue = (value: AppContextType["value"]) => {
    localStorage.setItem(LocalStorageKeys.SELECTED_NS_NAME, JSON.stringify(value));
    setAppValue(value);
  }

  useEffect(() => {
    if (
      !ownedNames?.find((x) => x.nftId === appValue.selectedSuinsName?.nftId)
    ) {
      setAppValue({ selectedSuinsName: null });
    }
  }, [ownedNames]);

  return (
    <AppContext.Provider value={{ value: appValue, setValue: setAndCacheValue }}>
      <div className="border-b border-border-classic">
        <div className="container flex items-center gap-Regular pb-Regular">
          <Text variant="xsmall/semibold" family="inter" className="max-md:hidden">
            Selected Organization:
          </Text>
          <div className="w-[300px]">
            <ComboBox
              placeholder="Select a name..."
              value={appValue.selectedSuinsName?.nftId}
              options={formatNamesForComboBox(ownedNames ?? [])}
              setValue={selectSuinsName}
              showSearch={false}
            />
          </div>
        </div>
      </div>
      <NetworkMissmatch expectedNetwork="mainnet" />
      {children}
    </AppContext.Provider>
  );
}
