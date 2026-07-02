/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x0f6b71233780a3f362137b44ac219290f4fd34eb81e0cb62ddf4bb38d1f9a3a1::display';
export const PackageDisplay = new MoveStruct({ name: `${$moduleName}::PackageDisplay`, fields: {
        gradient_from: bcs.string(),
        gradient_to: bcs.string(),
        text_color: bcs.string(),
        name: bcs.string(),
        uri_encoded_name: bcs.string()
    } });
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        '0x1::string::String',
        '0x1::string::String',
        '0x1::string::String',
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'display',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface DefaultOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function _default(options: DefaultOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'display',
        function: 'default',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NewSvgTextOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<string>
    ];
}
export function newSvgText(options: NewSvgTextOptions) {
    const packageAddress = options.package ?? '0xc88768f8b26581a8ee1bf71e6a6ec0f93d4cc6460ebb66a31b94d64de8105c98';
    const argumentsTypes = [
        '0x1::string::String',
        'u64',
        'u64',
        'u64',
        '0x1::string::String'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'display',
        function: 'new_svg_text',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}