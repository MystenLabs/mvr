import { type Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Content } from "@/data/content";

export const metadata: Metadata = {
  title: Content.notFound.title,
};

export default function NotFound() {
  return (
    <>
      <Header />
      <EmptyState
        icon={Content.notFound.icon}
        title={Content.notFound.title}
        description={Content.notFound.description}
        titleAs="h1"
      >
        <Button asChild variant="secondary">
          <Link href="/">{Content.notFound.button}</Link>
        </Button>
      </EmptyState>
    </>
  );
}
