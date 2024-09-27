
export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export const Networks = {
    mainnet: 'mainnet',
    testnet: 'testnet',
    devnet: 'devnet',
    // localnet: 'localnet',
}

export const AvailableNetworks = {
    mainnet: 'mainnet',
    testnet: 'testnet',
}


export enum AppQueryKeys {
    APP = 'app',
    OWNED_SUINS_NAMES = 'owned-suins-names',
    OWNED_APPS = 'owned-apps',
    OWNED_PACKAGE_INFOS = 'owned-package-infos',
    OWNED_UPGRADE_CAPS = 'owned-upgrade-caps',
    UPGRADE_CAP_MODULE = 'upgrade-cap-module',
}
