"use client";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";
import Link from "next/link";
import { useOwnedSuinsNames } from "@/hooks/useOwnedSuiNSNames";

export default function App() {

  const { data: suinsNames } = useOwnedSuinsNames();

  console.log(suinsNames);
  if (suinsNames?.length === 0)
    return (
      <EmptyState
        icon={Content.emptyStates.suinsNames.icon}
        title={Content.emptyStates.suinsNames.title}
        description={Content.emptyStates.suinsNames.description}
      >
        <Button size="lg" variant="outline" asChild>
          <Link href="https://www.suins.io" target="_blank">
            {Content.emptyStates.suinsNames.button}
          </Link>
        </Button>
      </EmptyState>
    );
  return (
    <main>
      <h1>This is Move Registry packages..</h1>
    </main>
  );
}
