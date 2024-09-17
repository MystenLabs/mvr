'use client'
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "../../data/content";

export default function Packages() {
  if (true)
    return (
      <EmptyState
        icon={Content.emptyStates.package.icon}
        title={Content.emptyStates.package.title}
        description={Content.emptyStates.package.description}
      >
        <Button variant="outline">{Content.emptyStates.package.button}</Button>
      </EmptyState>
    );
  return (
    <main>
      <h1>This is Move Registry packages..</h1>
    </main>
  );
}
