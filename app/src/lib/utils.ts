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
