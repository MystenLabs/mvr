/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0::domain';
export const Domain = new MoveStruct({ name: `${$moduleName}::Domain`, fields: {
        labels: bcs.vector(bcs.string())
    } });