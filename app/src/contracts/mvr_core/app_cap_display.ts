/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x62c1f5b1cb9e3bfc3dd1f73c95066487b662048a6358eabdbf67f6cdeca6db4b::app_cap_display';
export const AppCapDisplay = new MoveStruct({ name: `${$moduleName}::AppCapDisplay`, fields: {
        title: bcs.string(),
        link_opacity: bcs.u8(),
        uri_encoded_text: bcs.string()
    } });