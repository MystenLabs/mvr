import { Network } from "@/utils/types";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sender(tx: Transaction) {
  return tx.moveCall({
    target: "0x2::tx_context::sender",
  });
}

// We're switching the accent color globally, to make sure modals
// also inherit the different palette.
export const switchGlobalAccent = (isTestnet: boolean) => {
  if (isTestnet) {
    document.body.classList.add("testnet-layout");
  } else {
    document.body.classList.remove("testnet-layout");
  }
};

/// A helper to check if value A and B are different.
/// In the case where "null" becomes "undefined" or "undefined" becomes "null",
/// we do not treat it as a change for forms!
export const nullishValueChanged = (a: any, b: any) => {
  if ((a === null && b === null) || (a === undefined && b === undefined))
    return false;
  // in this case, we treat it as a change for forms!
  if ((a === null && b === undefined) || (a === undefined && b === null))
    return false;

  // in this case, we do not treat it as a change for forms!
  if ((a === "" && b === undefined) || (a === undefined && b === ""))
    return false;
  if ((a === "" && b === null) || (a === null && b === "")) return false;

  return a !== b;
};

const SYSTEM_ADDRESSES = [
  "0x1",
  "0x2",
  "0x3",
  "0x4",
  "0x5",
  "0x6",
  "0x7",
  "0x8",
  "0x9",
  "0xdee",
];

export const beautifySuiAddress = (address: string, digits = 6) => {
  const normalized = normalizeSuiAddress(address);

  for (const systemAddress of SYSTEM_ADDRESSES) {
    if (normalized === normalizeSuiAddress(systemAddress)) {
      return systemAddress;
    }
  }

  return (
    normalized.substring(0, 4) +
    "..." +
    normalized.substring(normalized.length - digits)
  );
};


// A tanstack configuration for no refetching.
export const NoRefetching = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};
