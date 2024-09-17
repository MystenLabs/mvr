/* eslint-disable @next/next/no-img-element */
import {
    ConnectModal,
    useCurrentAccount,
    useCurrentWallet,
    useDisconnectWallet,
    useSwitchAccount,
} from '@mysten/dapp-kit';

import { Button } from '../ui/button';
import { useState } from 'react';
import { AccountSelector, AccountContent } from './AccountSelector';
import { SuiActiveAccountInfo, ActiveAccountInfo } from './AccountInfo';
import { useWalletNetwork } from '@/hooks/useWalletNetwork';

//TODO: use network explorer url
const EXPLORER_BASE_LINK = 'https://suiscan.xyz';

function ConnectSuiWalletButton() {
    const [open, setOpen] = useState(false);

    return (
        <ConnectModal
            open={open}
            trigger={
                <Button className="flex gap-2 items-center" variant="header" size="header">
                    <ActiveAccountInfo label="Connect" />
                </Button>
            }
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
            }}
        />
    );
}

export function SuiConnectPill() {
    const accounts = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();
    const { mutate: switchAccount } = useSwitchAccount();
    const { currentWallet, isConnecting, isDisconnected } = useCurrentWallet();
    const currentAccount = useCurrentAccount();

    const network = useWalletNetwork();
    const link = EXPLORER_BASE_LINK + (network === 'mainnet' ? '' : `/${network}`);
    
    if ((!currentAccount && !isConnecting) || isDisconnected) {
        return <ConnectSuiWalletButton />;
    }

    return (
        <AccountSelector trigger={<SuiActiveAccountInfo address={accounts?.address ?? ''} />}>
            {currentWallet?.accounts.map((account) => (
                <AccountContent
                    address={account.address}
                    key={account.address}
                    isOpen={
                        !!(currentAccount?.address && account.address === currentAccount?.address)
                    }
                    explorerUrl={`${link}/address/${account.address}`}
                    disconnect={disconnect}
                    onClick={(e) => {
                        e.preventDefault();
                        switchAccount({ account });
                    }}
                />
            ))}
        </AccountSelector>
    );
}
