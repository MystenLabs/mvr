/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useCurrentAccount,
  useCurrentWallet,
  useDAppKit,
  useWalletConnection,
} from "@mysten/dapp-kit-react";
import dynamic from "next/dynamic";

// dapp-kit's connect UI is a Lit web component that references `window` at
// import time, so load it client-side only to keep Next.js SSR/prerender happy.
const ConnectButton = dynamic(
  () => import("@mysten/dapp-kit-react/ui").then((m) => m.ConnectButton),
  { ssr: false },
);

import { AccountSelector, AccountContent } from "./AccountSelector";
import { SuiActiveAccountInfo } from "./AccountInfo";
import { useWalletNetwork } from "@/hooks/useWalletNetwork";
import { dAppKit } from "@/dapp-kit";

//TODO: use network explorer url
const EXPLORER_BASE_LINK = "https://suiscan.xyz";

export function SuiConnectPill() {
  const dappKit = useDAppKit();
  const currentAccount = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const { isConnecting, isDisconnected } = useWalletConnection();

  const network = useWalletNetwork();
  const link =
    EXPLORER_BASE_LINK + (network === "mainnet" ? "" : `/${network}`);

  if ((!currentAccount && !isConnecting) || isDisconnected) {
    // TODO(theme): restyle this connect entrypoint to match the old mvrWalletTheme pill.
    return <ConnectButton instance={dAppKit} />;
  }

  return (
    <AccountSelector
      trigger={<SuiActiveAccountInfo address={currentAccount?.address ?? ""} />}
    >
      {currentWallet?.accounts.map((account) => (
        <AccountContent
          address={account.address}
          key={account.address}
          isOpen={
            !!(
              currentAccount?.address &&
              account.address === currentAccount?.address
            )
          }
          explorerUrl={`${link}/address/${account.address}`}
          disconnect={() => dappKit.disconnectWallet()}
          onClick={(e) => {
            e.preventDefault();
            dappKit.switchAccount({ account });
          }}
        />
      ))}
    </AccountSelector>
  );
}
