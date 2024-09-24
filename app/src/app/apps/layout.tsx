"use client";

import { NetworkMissmatch } from "@/components/NetworkMissmatch";
import {
  AppContext,
  AppContextType,
} from "@/components/providers/app-provider";
import { ComboBox } from "@/components/ui/combobox";
import { Text } from "@/components/ui/Text";
import { useOwnedSuinsNames } from "@/hooks/useOwnedSuiNSNames";
import { useEffect, useState } from "react";

export default function AppsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: ownedNames } = useOwnedSuinsNames();

  const [appValue, setAppValue] = useState<AppContextType>({
    selectedSuinsName: null,
  });

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName =
      ownedNames?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setAppValue({ selectedSuinsName });
  };

  useEffect(() => {
    if (
      !ownedNames?.find((x) => x.nftId === appValue.selectedSuinsName?.nftId)
    ) {
      setAppValue({ selectedSuinsName: null });
    }
  }, [ownedNames]);

  return (
    <AppContext.Provider value={appValue}>
      <div className="border-b border-border-classic">
        <div className="container flex items-center gap-Regular pb-Regular">
          <Text variant="xsmall/semibold" family="inter">
            Select an org name
          </Text>
          <div className="w-[300px]">
            <ComboBox
              value={appValue.selectedSuinsName?.nftId}
              options={
                ownedNames?.map((x) => ({
                  value: x.nftId,
                  label: x.domainName,
                })) ?? []
              }
              setValue={selectSuinsName}
            />
          </div>
        </div>
      </div>
      <NetworkMissmatch expectedNetwork="mainnet" />
      {children}
    </AppContext.Provider>
  );
}
