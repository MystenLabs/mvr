/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as app_info from './app_info';
import * as vec_map from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_map';
import * as name_1 from './name';
import * as app_cap_display from './app_cap_display';
const $moduleName = '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_record';
export const AppRecord = new MoveStruct({ name: `${$moduleName}::AppRecord`, fields: {
        app_cap_id: bcs.Address,
        ns_nft_id: bcs.Address,
        app_info: bcs.option(app_info.AppInfo),
        networks: vec_map.VecMap(bcs.string(), app_info.AppInfo),
        metadata: vec_map.VecMap(bcs.string(), bcs.string()),
        storage: bcs.Address
    } });
export const AppCap = new MoveStruct({ name: `${$moduleName}::AppCap`, fields: {
        id: bcs.Address,
        name: name_1.Name,
        is_immutable: bcs.bool(),
        display: app_cap_display.AppCapDisplay
    } });
export interface IsCapImmutableOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function isCapImmutable(options: IsCapImmutableOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'app_record',
        function: 'is_cap_immutable',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NameOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function name(options: NameOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'app_record',
        function: 'name',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}