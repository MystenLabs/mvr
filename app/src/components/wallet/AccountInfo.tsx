import { formatAddress } from '@mysten/sui/utils';
import { useResolveSuiNSName } from '@mysten/dapp-kit';
import { normalizeSuiNSName } from "@mysten/sui/utils"

import { Text } from '../ui/Text';
import { ReactNode } from 'react';
import MvrLogo from '@/icons/MvrLogo';

type AccountInfoProps = {
    address: string;
    img?: ReactNode;
    name?: string;
};

function AccountInfo({ address, img, name }: AccountInfoProps) {
    return (
        <div className="relative flex items-center justify-start gap-3">
            <div className="relative h-[43px] w-[43px] rounded-full border border-border-classic flex items-center justify-center">
                {img ?? <MvrLogo className="object-contain" width={22} height={22} />}
            </div>
            <div className="flex flex-col gap-1 whitespace-nowrap text-start">
                <Text kind="label" size="label-regular" className="max-w-[200px]">
                    {name ? name : formatAddress(address)}
                </Text>

                {name && (
                    <Text kind="paragraph" size="paragraph-small">
                        {formatAddress(address)}
                    </Text>
                )}
            </div>
        </div>
    );
}

export function ActiveAccountInfo({ label }: { label: string }) {
    return (
        <div className="flex gap-2 items-center">
            <Text kind="label" size="label-regular">
                {label}
            </Text>
        </div>
    );
}

export function SuiActiveAccountInfo({ address }: { address: string }) {
    const { data: name } = useResolveSuiNSName(address);
    // const { data } = useGetNameAvatar(name);
    return <ActiveAccountInfo label={name ? normalizeSuiNSName(name) : formatAddress(address)} />
}

export function SuiAccountInfo({ address }: { address: string }) {
    const { data: name } = useResolveSuiNSName(address);
    // const { data } = useGetNameAvatar(name);
    return (
        <AccountInfo
            address={address}
            img={undefined}
            name={name ? normalizeSuiNSName(name) : undefined}
        />
    );
}
