// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext } from 'react';

export type MVRSetup = {
	isCustom: boolean;
	customAddress: string | undefined;
};

export const MVRContext = createContext<MVRSetup>({
	isCustom: false,
	customAddress: undefined,
});

export function useMVRContext() {
	return useContext(MVRContext);
}
