/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as domain from './deps/0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0/domain';
const $moduleName = '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::name';
export const Name = new MoveStruct({ name: `${$moduleName}::Name`, fields: {
        org: domain.Domain,
        app: bcs.vector(bcs.string())
    } });
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        '0x1::string::String',
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'name',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface HasValidOrgOptions {
    package?: string;
    arguments: [
        TransactionArgument,
        RawTransactionArgument<string>
    ];
}
export function hasValidOrg(options: HasValidOrgOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'name',
        function: 'has_valid_org',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AppOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function app(options: AppOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'name',
        function: 'app',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ToStringOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function toString(options: ToStringOptions) {
    const packageAddress = options.package ?? '0xbb97fa5af2504cc944a8df78dcb5c8b72c3673ca4ba8e4969a98188bf745ee54';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'name',
        function: 'to_string',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}