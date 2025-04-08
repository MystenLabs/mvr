"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import Link from "next/link";
import {
  formatNamesForComboBox,
  useOrganizationList,
} from "@/hooks/useOrganizationList";
import { useAppState } from "@/components/providers/app-provider";
import { ComboBox } from "@/components/ui/combobox";
import { AppCap, useOwnedApps } from "@/hooks/useOwnedApps";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";
import { AppViewer } from "@/components/apps/AppViewer";
import CreateOrUpdateApp from "@/components/modals/apps/CreateOrUpdateApp";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PublicNameLabel } from "@/components/ui/public-name-label";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import PackageSelected from "@/icons/PackageSelected";
import PackageUnselected from "@/icons/PackageUnselected";

export default function App() {
  const { names: namesList } = useOrganizationList();
  const { data: apps } = useOwnedApps();
  const { value: appValue, setValue } = useAppState();

  const [showCreateApp, setShowCreateApp] = useState(false);
  const [selectedAppCap, setSelectedAppCap] = useState<AppCap | null>(null);

  const isTabletOrAbove = useBreakpoint("md");

  const nsMatchingApps = useMemo(() => {
    if (!apps || !appValue.selectedSuinsName) return [];
    return apps.filter(
      (app) => app.orgName === appValue.selectedSuinsName?.domainName,
    );
  }, [apps, appValue.selectedSuinsName]);

  useEffect(() => {
    setSelectedAppCap(nsMatchingApps[0] ?? null);
  }, [appValue.selectedSuinsName]);

  const selectSuinsName = (nftId: string) => {
    const selectedSuinsName = namesList?.find((x) => x.nftId === nftId) ?? null;
    if (!selectedSuinsName) return;
    setValue({ selectedSuinsName });
  };

  const state = namesList?.length
    ? Content.suinsNames
    : Content.emptyStates.suinsNames;

  if (namesList?.length === 0 || !appValue.selectedSuinsName)
    return (
      <EmptyState
        icon={state.icon}
        title={state.title}
        description={state.description}
        useCard
        size="md"
      >
        {namesList.length > 0 && (
          <ComboBox
            placeholder="Select one..."
            value={appValue.selectedSuinsName?.nftId}
            options={formatNamesForComboBox(
              namesList ?? [],
              <PublicNameLabel />,
            )}
            setValue={selectSuinsName}
          />
        )}

        <Button variant="linkActive" asChild className="mt-lg">
          <Link href="https://www.suins.io" target="_blank">
            {formatNamesForComboBox(namesList ?? [], <PublicNameLabel />)
              .length > 0 && "or"}{" "}
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
    <main className="px-md lg:py-xl container flex-grow">
      <div className="gap-2xl lg:flex lg:flex-grow">
        <div className="gap-xs max-lg:py-lg lg:px-sm py-sm flex-shrink-0 overflow-y-auto lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col">
          {namesList.length > 0 && (
            <ComboBox
              placeholder="Select one..."
              value={appValue.selectedSuinsName?.nftId}
              options={formatNamesForComboBox(
                namesList ?? [],
                <PublicNameLabel />,
              )}
              setValue={selectSuinsName}
            />
          )}

          <div className="my-md flex items-center justify-between">
            <Label className="block">Packages</Label>
            <Dialog open={showCreateApp} onOpenChange={setShowCreateApp}>
              <CreateOrUpdateApp
                suins={appValue.selectedSuinsName}
                closeDialog={() => setShowCreateApp(false)}
              />
              {!appValue.selectedSuinsName?.isCapabilityOnly && (
                <DialogTrigger asChild>
                  <Button variant="linkActive" size="fit">
                    <Plus className="text-content-accent h-5 w-5" />
                  </Button>
                </DialogTrigger>
              )}
            </Dialog>
          </div>

          <div className="gap-2xs grid grid-cols-1">
            {isTabletOrAbove && nsMatchingApps.length < 5 ? (
              nsMatchingApps.map((app) => (
                <div
                  key={app.objectId}
                  className={cn(
                    "px-md py-sm hover:bg-bg-accentBleedthrough2 gap-sm flex cursor-pointer items-center rounded-sm text-content-tertiary ease-in-out",
                    selectedAppCap?.objectId === app.objectId &&
                      "bg-bg-accentBleedthrough2",
                  )}
                  onClick={() => setSelectedAppCap(app)}
                >
                  {selectedAppCap?.objectId === app.objectId ? (
                    <PackageSelected className="fill-content-accent" />
                  ) : (
                    <PackageUnselected className="text-content-primary" />
                  )}
                  <Text
                    kind="label"
                    size="label-small"
                    className="text-content-primary"
                  >
                    {app.appName}
                  </Text>
                </div>
              ))
            ) : (
              <ComboBox
                title="Select a package"
                value={selectedAppCap?.objectId}
                options={nsMatchingApps.map((app) => ({
                  value: app.objectId,
                  label: app.normalizedName,
                }))}
                setValue={(value) =>
                  setSelectedAppCap(
                    nsMatchingApps.find((app) => app.objectId === value) ??
                      null,
                  )
                }
              />
            )}
          </div>
        </div>

        <div className="max-lg:py-lg block w-full break-words">
          {selectedAppCap && <AppViewer cap={selectedAppCap} />}
        </div>
      </div>
    </main>
  );
}
