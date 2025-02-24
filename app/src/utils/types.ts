import { Constants } from "@/lib/constants";

export type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export type PackageDisplayType = {
    gradientFrom: string;
    gradientTo: string;
    name: string;
    textColor: string;
  };
  
  export type PackageInfoData = {
    objectId: string;
    packageAddress: string;
    upgradeCapId: string;
    display: PackageDisplayType;
    gitVersionsTableId: string;
    metadata: any;
    suiDisplay?: {
        imageUrl: string;
    }
  };

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

export const packageInfoType = (network: Network) =>
    `${Constants.packageInfoIds[network]}::package_info::PackageInfo`;

export enum AppQueryKeys {
    APP = 'app',
    OWNED_SUINS_NAMES = 'owned-suins-names',
    OWNED_SUINS_SUBNAMES = 'owned-suins-subnames',
    OWNED_APPS = 'owned-apps',
    OWNED_PACKAGE_INFOS = 'owned-package-infos',
    OWNED_UPGRADE_CAPS = 'owned-upgrade-caps',
    UPGRADE_CAP_MODULE = 'upgrade-cap-module',
    PACKAGE_INFO_BY_ID = 'package-info-by-id',
    VERSIONS_TABLE = 'versions-table',
    KIOSK_ITEMS = 'kiosk-items',
    OWNED_KIOSKS = 'owned-kiosks',
    LIST_OF_OBJECTS = 'list-of-objects',
    GIT_SOURCE = 'git-source',
    PACKAGE_LATEST_VERSION = 'package-latest-version',
    PACKAGE_INIT_AND_AT_VERSION = 'package-init-and-at-version',
}
