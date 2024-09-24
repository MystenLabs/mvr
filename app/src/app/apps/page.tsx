"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import Link from "next/link";
import {
  formatNamesForComboBox,
  useOwnedSuinsNames,
} from "@/hooks/useOwnedSuiNSNames";
import { useAppState } from "@/components/providers/app-provider";
import { ComboBox } from "@/components/ui/combobox";
import { useOwnedApps } from "@/hooks/useOwnedApps";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateApp from "@/components/modals/apps/CreateApp";
import { useState } from "react";

export default function App() {
  const { data: suinsNames } = useOwnedSuinsNames();
  const { data: apps } = useOwnedApps();
  const { value: appValue, setValue } = useAppState();

  const [showCreateApp, setShowCreateApp] = useState(false);

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName =
      suinsNames?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setValue({ selectedSuinsName });
  };

  if (suinsNames?.length === 0 || !appValue.selectedSuinsName)
    return (
      <EmptyState
        icon={Content.emptyStates.suinsNames.icon}
        title={Content.emptyStates.suinsNames.title}
        description={Content.emptyStates.suinsNames.description}
      >
        <ComboBox
          placeholder="Select a name..."
          value={appValue.selectedSuinsName?.nftId}
          options={formatNamesForComboBox(suinsNames ?? [])}
          setValue={selectSuinsName}
        />
        <Button size="lg" variant="outline" asChild className="mt-Large">
          <Link href="https://www.suins.io" target="_blank">
            {formatNamesForComboBox(suinsNames ?? []).length > 0 && "or"}{" "}
            {Content.emptyStates.suinsNames.button}
          </Link>
        </Button>
      </EmptyState>
    );

  if (apps?.length === 0) {
    return (
      <Dialog open={showCreateApp} onOpenChange={setShowCreateApp}>
        <CreateApp suins={appValue.selectedSuinsName} closeDialog={() => setShowCreateApp(false)} />
        <EmptyState
          icon={Content.emptyStates.apps.icon}
          title={Content.emptyStates.apps.title}
          description={Content.emptyStates.apps.description}
        >
          <DialogTrigger asChild>
            <Button size="lg">
              {
                Content.emptyStates.apps.button
              }
            </Button>
          </DialogTrigger>
        </EmptyState>
      </Dialog>
    );
  }
  return (
    <main>
      <h1>This is Move Registry packages..</h1>
    </main>
  );
}
