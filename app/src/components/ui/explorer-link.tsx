"use client";

import { Network } from "@/utils/types";
import Link from "next/link";

export default function ExplorerLink({
  network,
  type = 'object',
  idOrHash,
  children
}: {
  network: Network
  type: "object" | "address" | 'tx';
  idOrHash: string;
  children: React.ReactNode;
}) {
  return (
    <Link   
      className="underline"
      href={idOrHash ? `https://www.suiexplorer.com/${type}/${idOrHash}?network=${network}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Link>
  );
}
