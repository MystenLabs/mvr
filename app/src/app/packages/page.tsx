import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Packages() {
  
  if (true) return <EmptyState icon="📦">
    <Button variant="outline">
      Learn more
    </Button>
  </EmptyState>;
  return (
    <main>
      <h1>This is Move Registry packages..</h1>
    </main>
  );
}
