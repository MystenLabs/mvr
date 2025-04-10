import { ReactNode } from "react";
import Header from "@/components/Header";

export function PlainPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className="flex-grow">
        <div className="py-md container">{children}</div>
      </div>
    </>
  );
}
