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
    OWNED_APPS = 'owned-apps',
    OWNED_PACKAGE_INFOS = 'owned-package-infos',
    OWNED_UPGRADE_CAPS = 'owned-upgrade-caps',
    UPGRADE_CAP_MODULE = 'upgrade-cap-module',
    PACKAGE_INFO_BY_ID = 'package-info-by-id',
}
