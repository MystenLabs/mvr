'use client';

import { ReactNode, ComponentPropsWithoutRef, useState } from 'react';

import {
    DropdownMenuContent,
    DropdownMenuItem,
    Root,
    Trigger,
    Item,
} from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../ui/button';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { SuiAccountInfo } from './AccountInfo';
import clsx from 'clsx';
import SvgCopy from '@/icons/Copy';
import SvgCopied from '@/icons/Copied';
import SvgDelete from '@/icons/Delete';
import { Text } from '../ui/Text';

type AccountContentProps = {
    address: string;
    img?: string;
};

type AccountSelectorProps = {
    children: ReactNode;
    trigger: ReactNode;
    align?: 'start' | 'end';
};

export function AccountSelector({ trigger, children, align = 'end' }: AccountSelectorProps) {
    return (
        <Root>
            <Trigger asChild>
                <Button
                    className="flex gap-2 data-[state='open']:bg-background-secondary triggerButton"
                    variant="header"
                    size="header"
                    // variant="outline"
                >
                    {trigger}
                    <ChevronDown className="h-4 w-4 data-[state=open]:rotate-180" />
                </Button>
            </Trigger>
            <DropdownMenuContent
                sideOffset={12}
                align={align}
                asChild
                className="z-50 w-[374px] max-sm:w-[90vw] rounded-5xl overflow-hidden"
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                >
                    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-5xl bg-background-dark p-2 transition-all placeholder:text-content-primary-inactive border border-border-classic focus:pl-16 focus:outline-none focus:placeholder:text-transparent md:w-[372px]">
                        {children}
                    </div>
                </motion.div>
            </DropdownMenuContent>
        </Root>
    );
}

function AccountContentActionButton({
    onClick,
    icon,
    label,
    className,
}: {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <Button
            className="flex justify-center h-[68px] rounded-3xl border border-border-classic py-2 px-4 transition ease-in-out hover:border-transparent flex-col gap-1 items-center group w-[107px]"
            onSelect={onClick}
            onClick={onClick}
            variant="link"
        >
            {icon}
            <Text
                variant="small/bold"
                color="secondary"
                className={clsx('group-hover:text-content-primary', className)}
            >
                {label}
            </Text>
        </Button>
    );
}

export function AccountContent({
    address,
    isOpen,
    disconnect,
    onClick,
    explorerUrl,
    ...props
}: AccountContentProps & {
    isOpen: boolean;
    disconnect: () => void;
    explorerUrl?: string;
} & ComponentPropsWithoutRef<typeof Item>) {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = async () => {
        if (copied) return;
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (err) {}
    };

    const ActiveAcctInfo = <SuiAccountInfo address={address} />

    return (
        <DropdownMenuItem
            {...props}
            onClick={onClick}
            className="relative focus:outline-none focus:placeholder:text-transparent bg-background-dark"
        >
            <AnimatePresence initial={false}>
                {isOpen ? (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        className="overflow-hidden"
                        variants={{
                            open: { opacity: 1, height: 'auto', overflow: 'hidden' },
                            collapsed: { opacity: 0, height: 0, overflow: 'hidden' },
                        }}
                        transition={{ duration: 0.6, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="relative flex h-full flex-col gap-2 overflow-hidden border border-stroke-primary rounded-[20px] p-Regular transition-colors focus:outline-none w-full bg-background-secondary">
                            <div className="relative z-20 mb-2 flex cursor-pointer items-center justify-between rounded-6xl focus:outline-none w-full">
                                {ActiveAcctInfo}
                                <ChevronDown className="relative h-4 w-4 text-content-primary" />
                            </div>
                            <div className="relative z-20 flex flex-col items-start gap-2">
                                <div className="flex w-full flex-1 gap-[10px]">
                                    <AccountContentActionButton
                                        onClick={copyToClipboard}
                                        className={copied ? '!text-content-positive' : ''}
                                        icon={
                                            copied ? (
                                                <SvgCopied className="h-4 w-4 text-content-positive" />
                                            ) : (
                                                <SvgCopy className="h-4 w-4 text-content-primary" />
                                            )
                                        }
                                        label={copied ? 'Copied' : 'Copy'}
                                    />
                                    <AccountContentActionButton
                                        onClick={() => window.open(explorerUrl, '_blank')}
                                        icon={
                                            <ArrowUpRight
                                                height={16}
                                                width={16}
                                                className="h-4 w-4 text-content-primary"
                                            />
                                        }
                                        label="Explorer"
                                    />
                                    <AccountContentActionButton
                                        onClick={disconnect}
                                        icon={
                                            <SvgDelete className="h-4 w-4 text-content-primary" />
                                        }
                                        label="Disconnect"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.4 }}
                        className="overflow-hidden"
                    >
                        <div className="flex cursor-pointer items-center justify-between rounded-sm px-6 py-4 hover:bg-background-secondary focus:outline-none focus:placeholder:text-transparent w-full">
                            {ActiveAcctInfo}
                            <ChevronDown className="relative h-4 w-4 -rotate-90 text-content-secondary" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DropdownMenuItem>
    );
}
