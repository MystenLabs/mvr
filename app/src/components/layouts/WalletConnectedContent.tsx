"use client";
import { useActiveAddress } from "@/hooks/useActiveAddress";
import { EmptyState } from "../EmptyState";
import { Button } from "../ui/button";
import Link from "next/link";
import { Content } from "@/data/content";

export function WalletConnectedContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeAddress = useActiveAddress();

  if (!activeAddress) {
    return (
      <div className="container flex-grow">
        <EmptyState {...Content.emptyStates.wallet}>
          <Button asChild variant="secondary">
            <Link href="/faq">{Content.emptyStates.wallet.button}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  return children;
}
