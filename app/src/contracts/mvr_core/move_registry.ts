/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table';
const $moduleName = '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::move_registry';
export const MoveRegistry = new MoveStruct({ name: `${$moduleName}::MoveRegistry`, fields: {
        id: bcs.Address,
        registry: table.Table,
        version: bcs.u8()
    } });
export const VersionCap = new MoveStruct({ name: `${$moduleName}::VersionCap`, fields: {
        id: bcs.Address
    } });
export const MOVE_REGISTRY = new MoveStruct({ name: `${$moduleName}::MOVE_REGISTRY`, fields: {
        dummy_field: bcs.bool()
    } });
export interface RegisterOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function register(options: RegisterOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'register',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface RemoveOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function remove(options: RemoveOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'remove',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AssignPackageOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function assignPackage(options: AssignPackageOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'assign_package',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetNetworkOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function setNetwork(options: SetNetworkOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String',
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'set_network',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UnsetNetworkOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function unsetNetwork(options: UnsetNetworkOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'unset_network',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface BurnCapOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function burnCap(options: BurnCapOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'burn_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetVersionOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number>
    ];
}
export function setVersion(options: SetVersionOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        'u8'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'set_version',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AppExistsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function appExists(options: AppExistsOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'app_exists',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMetadataOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function setMetadata(options: SetMetadataOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String',
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'set_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UnsetMetadataOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function unsetMetadata(options: UnsetMetadataOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null,
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'move_registry',
        function: 'unset_metadata',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}