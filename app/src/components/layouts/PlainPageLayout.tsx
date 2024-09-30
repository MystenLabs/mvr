import { ReactNode } from "react";

export function PlainPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex-grow border-t border-border-classic">
      <div className="container py-Regular">{children}</div>
    </div>
  );
}
