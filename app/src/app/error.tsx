"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "@/data/content";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header />
      <EmptyState
        icon={Content.error.icon}
        title={Content.error.title}
        description={Content.error.description}
        titleAs="h1"
      >
        <Button variant="secondary" onClick={() => reset()}>
          {Content.error.button}
        </Button>
      </EmptyState>
    </>
  );
}
