import { ReactNode } from "react";

export function PlainPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-grow">
      <div className="container py-md">{children}</div>
    </div>
  );
}
