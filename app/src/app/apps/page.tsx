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
import { AppCap, useOwnedApps } from "@/hooks/useOwnedApps";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";
import { AppViewer } from "@/components/apps/AppViewer";
import CreateOrUpdateApp from "@/components/modals/apps/CreateOrUpdateApp";

export default function App() {
  const { data: suinsNames } = useOwnedSuinsNames();
  const { data: apps } = useOwnedApps();
  const { value: appValue, setValue } = useAppState();

  const [showCreateApp, setShowCreateApp] = useState(false);
  const [selectedAppCap, setSelectedAppCap] = useState<AppCap | null>(null);

  const nsMatchingApps = useMemo(() => {
    if (!apps || !appValue.selectedSuinsName) return [];
    console.log(apps.filter(
      (app) => app.orgName === appValue.selectedSuinsName?.domainName,
    ));
    return apps.filter(
      (app) => app.orgName === appValue.selectedSuinsName?.domainName,
    );
  }, [apps, appValue.selectedSuinsName]);

  useEffect(() => {
    setSelectedAppCap(nsMatchingApps[0] ?? null);
  }, [appValue.selectedSuinsName]);

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName =
      suinsNames?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setValue({ selectedSuinsName });
  };

  const state = suinsNames?.length
    ? Content.suinsNames
    : Content.emptyStates.suinsNames;

  if (suinsNames?.length === 0 || !appValue.selectedSuinsName)
    return (
      <EmptyState
        icon={state.icon}
        title={state.title}
        description={state.description}
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
            {state.button}
          </Link>
        </Button>
      </EmptyState>
    );

  if (!nsMatchingApps.length) {
    return (
      <Dialog open={showCreateApp} onOpenChange={setShowCreateApp}>
        <CreateOrUpdateApp
          suins={appValue.selectedSuinsName}
          closeDialog={() => setShowCreateApp(false)}
        />
        <EmptyState
          icon={Content.emptyStates.apps.icon}
          title={Content.emptyStates.apps.title}
          description={Content.emptyStates.apps.description}
        >
          <DialogTrigger asChild>
            <Button size="lg">{Content.emptyStates.apps.button}</Button>
          </DialogTrigger>
        </EmptyState>
      </Dialog>
    );
  }
  return (
    <main className="container flex-grow">
      <div className="gap-Regular lg:flex lg:flex-grow">
        <div className="flex-shrink-0 gap-XSmall overflow-y-auto border-border-classic p-Regular lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col lg:border-r">
          <Dialog open={showCreateApp} onOpenChange={setShowCreateApp}>
            <CreateOrUpdateApp
              suins={appValue.selectedSuinsName}
              closeDialog={() => setShowCreateApp(false)}
            />
            <DialogTrigger>
              <Button variant="link">{Content.app.button}</Button>
            </DialogTrigger>
          </Dialog>
          {nsMatchingApps.map((app) => (
            <div
              key={app.objectId}
              className={cn(
                "cursor-pointer px-Small py-XSmall text-content-tertiary",
                selectedAppCap?.objectId === app.objectId &&
                  "rounded-md bg-primary",
              )}
              onClick={() => setSelectedAppCap(app)}
            >
              <Text variant="xsmall/regular" className="block max-w-[250px]">
                {app.normalizedName}
              </Text>
            </div>
          ))}
        </div>

        <div className="block w-full break-words p-Large">
          {selectedAppCap && <AppViewer cap={selectedAppCap} />}
        </div>
      </div>
    </main>
  );
}
