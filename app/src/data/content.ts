// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export const Content = {
    emptyStates: {
        package: {
            icon: '📦',
            title: 'Publish your package first.',
            description: 'Before you start using this, you need to have a package published. Once you have a package published, come back to manage it.',
            button: 'Learn more',
        },
        wallet: {
            icon: '👋🏽',
            title: 'Connect your wallet or enter a custom address',
            description: 'To get started, connect your wallet or use a custom address.',
            button: 'Read our FAQ'
        }
    },
    package: {
        icon: '📦',
        title: 'Let\'s get started!',
        description: 'It seems like you have some packages. Create a new package by clicking the button below.',
        button: 'Create a Package metadata NFT'
    },
    addressPlaceholder: 'Enter your custom address (e.g. 0xdee)',

    networkMissmatch: (network: string) => `The wallet\'s network does not match the network of the application (${network}). Please switch your wallet to the correct network to continue.`,
}
