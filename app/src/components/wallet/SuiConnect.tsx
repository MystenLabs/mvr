import {
    ConnectModal,
    useCurrentAccount,
    useDisconnectWallet,
    useResolveSuiNSName,
} from '@mysten/dapp-kit';
import { Button } from '../ui/button';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Disconnect from '@/icons/Disconnect';
import { formatAddress } from '@mysten/sui/utils';
import { Text } from '../ui/Text';

export function getDisplayName(nsName?: string | null, address?: string) {
    if (nsName) return nsName;
    return address ? formatAddress(address) : null;
}

export function SuiConnect() {
    const [open, setOpen] = useState(false);
    const accounts = useCurrentAccount();
    const disconnect = useDisconnectWallet();
    const suinsName = useResolveSuiNSName(accounts?.address);
    return (
        <ConnectModal
            trigger={
                <Button
                    onClick={async (e) => {
                        if (accounts?.address) {
                            e.preventDefault();
                            return disconnect.mutate();
                        } else {
                            setOpen(true);
                        }
                    }}
                    variant="header"
                    size="header"
                    className="flex w-full justify-between text-content-inverted space-y-4 items-center"
                >
                    <div className="flex items-center justify-between w-full group">
                        <Text
                            color="regular"
                            variant="regular/medium"
                        >
                            {getDisplayName(suinsName.data, accounts?.address) ?? 'Connect wallet'}
                        </Text>
                        <div
                            className={cn(
                                'text-content-secondary',
                                accounts?.address
                                    ? 'group-hover:text-content-negative'
                                    : 'group-hover:text-content-accent1Hover',
                            )}
                        >
                            {accounts?.address ? (
                                <Disconnect />
                            ) : (
                                <ArrowRight height={24} width={24} />
                            )}
                        </div>
                    </div>
                </Button>
            }
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
            }}
        />
    );
}
