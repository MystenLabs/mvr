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

        <Button size="lg" variant="outline" asChild className="mt-Large">
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
    <main className="container flex-grow">
      <div className="gap-Regular lg:flex lg:flex-grow">
        <div className="flex-shrink-0 gap-XSmall overflow-y-auto border-border-classic py-Regular max-lg:border-b max-lg:py-Large lg:flex lg:h-[75vh] lg:w-[300px] lg:flex-col lg:border-r lg:px-Regular">
          <Dialog open={showCreateApp} onOpenChange={setShowCreateApp}>
            <CreateOrUpdateApp
              suins={appValue.selectedSuinsName}
              closeDialog={() => setShowCreateApp(false)}
            />
            {!appValue.selectedSuinsName?.isCapabilityOnly && (
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="mb-Large w-full lg:mb-Small"
                  disabled={appValue.selectedSuinsName?.isCapabilityOnly}
                >
                  {Content.app.button}
                </Button>
              </DialogTrigger>
            )}
          </Dialog>
          {isTabletOrAbove && nsMatchingApps.length < 5 ? (
            nsMatchingApps.map((app) => (
              <div
                key={app.objectId}
                className={cn(
                  "cursor-pointer px-Small py-XSmall text-content-tertiary",
                  selectedAppCap?.objectId === app.objectId &&
                    "rounded-md bg-primary",
                )}
                onClick={() => setSelectedAppCap(app)}
              >
                <Text kind="paragraph" size="paragraph-xs">
                  {app.normalizedName}
                </Text>
              </div>
            ))
          ) : (
            <ComboBox
              title="Select one"
              value={selectedAppCap?.objectId}
              options={nsMatchingApps.map((app) => ({
                value: app.objectId,
                label: app.normalizedName,
              }))}
              setValue={(value) =>
                setSelectedAppCap(
                  nsMatchingApps.find((app) => app.objectId === value) ?? null,
                )
              }
            />
          )}
        </div>

        <div className="block w-full break-words max-lg:py-Large lg:p-Large">
          {selectedAppCap && <AppViewer cap={selectedAppCap} />}
        </div>
      </div>
    </main>
  );
}
