/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as display from './display';
import * as vec_map from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table';
const $moduleName = '0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::package_info';
export const PACKAGE_INFO = new MoveStruct({ name: `${$moduleName}::PACKAGE_INFO`, fields: {
        dummy_field: bcs.bool()
    } });
export const PackageInfo = new MoveStruct({ name: `${$moduleName}::PackageInfo`, fields: {
        id: bcs.Address,
        display: display.PackageDisplay,
        upgrade_cap_id: bcs.Address,
        package_address: bcs.Address,
        metadata: vec_map.VecMap(bcs.string(), bcs.string()),
        git_versioning: table.Table
    } });
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface TransferOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function transfer(options: TransferOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        'address'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'transfer',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ReceiveOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function receive(options: ReceiveOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        '0x2::object::ID',
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'receive',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetDisplayOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function setDisplay(options: SetDisplayOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'set_display',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMetadataOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function setMetadata(options: SetMetadataOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        '0x1::string::String',
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'set_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UnsetMetadataOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function unsetMetadata(options: UnsetMetadataOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'unset_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetGitVersioningOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        TransactionArgument
    ];
}
export function setGitVersioning(options: SetGitVersioningOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        'u64',
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'set_git_versioning',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UnsetGitVersioningOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function unsetGitVersioning(options: UnsetGitVersioningOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'unset_git_versioning',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetCustomMetadataOptions<T0 extends BcsType<any>, T1 extends BcsType<any>> {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<T0>,
        RawTransactionArgument<T1>
    ];
    typeArguments: [
        string,
        string
    ];
}
export function setCustomMetadata<T0 extends BcsType<any>, T1 extends BcsType<any>>(options: SetCustomMetadataOptions<T0, T1>) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        `${options.typeArguments[0]}`,
        `${options.typeArguments[1]}`
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'set_custom_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface RemoveCustomMetadataOptions<T0 extends BcsType<any>> {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<T0>
    ];
    typeArguments: [
        string,
        string
    ];
}
export function removeCustomMetadata<T0 extends BcsType<any>>(options: RemoveCustomMetadataOptions<T0>) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null,
        `${options.typeArguments[0]}`
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'remove_custom_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface IdOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface PackageAddressOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function packageAddress(options: PackageAddressOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'package_address',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UpgradeCapIdOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function upgradeCapId(options: UpgradeCapIdOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'package_info',
        function: 'upgrade_cap_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}