import { Transaction } from "@mysten/sui/transactions"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function sender(tx: Transaction) {
  return tx.moveCall({
    target: '0x2::tx_context::sender'
  });
}
