/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_info';
export const AppInfo = new MoveStruct({ name: `${$moduleName}::AppInfo`, fields: {
        package_info_id: bcs.option(bcs.Address),
        package_address: bcs.option(bcs.Address),
        upgrade_cap_id: bcs.option(bcs.Address)
    } });
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string | null>,
        RawTransactionArgument<string | null>,
        RawTransactionArgument<string | null>
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        '0x1::option::Option<0x2::object::ID>',
        '0x1::option::Option<address>',
        '0x1::option::Option<0x2::object::ID>'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'app_info',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface DefaultOptions {
    package?: string;
    arguments?: [
    ];
}
export function _default(options: DefaultOptions = {}) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'app_info',
        function: 'default',
    });
}