'use client';

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/apps");
  }, []);

  return (
    <main className="container">
      <h1>This is the Move Registry homepage and I don't think you can land here anyhow!</h1>
    </main>
  );
}
