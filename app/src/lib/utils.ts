import { Network } from "@/utils/types";
import { Transaction } from "@mysten/sui/transactions";
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
  if (a === null && b === null || a === undefined && b === undefined) return false;
  // in this case, we treat it as a change for forms!
  if (a === null && b === undefined || a === undefined && b === null) return false;

  // in this case, we do not treat it as a change for forms!
  if (a === "" && b === undefined || a === undefined && b === "") return false;
  if (a === "" && b === null || a === null && b === "") return false;

  return a !== b;
}
