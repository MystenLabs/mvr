/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type BcsType, bcs } from '@mysten/sui/bcs';
import { MoveStruct } from '../../../utils/index';
const $moduleName = '0x2::vec_map';
export function Entry<T0 extends BcsType<any>, T1 extends BcsType<any>>(...typeParameters: [
    T0,
    T1
]) {
    return new MoveStruct({ name: `${$moduleName}::Entry<${typeParameters[0].name as T0['name']}, ${typeParameters[1].name as T1['name']}>`, fields: {
            key: typeParameters[0],
            value: typeParameters[1]
        } });
}
export function VecMap<T0 extends BcsType<any>, T1 extends BcsType<any>>(...typeParameters: [
    T0,
    T1
]) {
    return new MoveStruct({ name: `${$moduleName}::VecMap<${typeParameters[0].name as T0['name']}, ${typeParameters[1].name as T1['name']}>`, fields: {
            contents: bcs.vector(Entry(typeParameters[0], typeParameters[1]))
        } });
}