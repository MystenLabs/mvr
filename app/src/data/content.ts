// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export const Content = {
    emptyStates: {
        package: {
            icon: '📦',
            title: 'Publish your package first.',
            description: 'Before you start using this, you need to have a package published. Once you have a package published, come back to manage it.',
            button: 'Learn more',
        }
    },
    package: {
        icon: '📦',
        title: 'Let\'s get started!',
        description: 'It seems like you have some packages. Create a new package by clicking the button below.',
        button: 'Create a Package metadata NFT'
    },

    networkMissmatch: (network: string) => `The wallet\'s network does not match the network of the application (${network}). Please switch your wallet to the correct network to continue.`,
}
