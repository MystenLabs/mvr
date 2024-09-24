// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
'use client';

import { SuinsName } from '@/hooks/useOwnedSuiNSNames';
import { createContext, useContext } from 'react';

export type AppContextType = {
    selectedSuinsName: SuinsName | null;
}

export const AppContext = createContext<AppContextType>({
    selectedSuinsName: null,
});

export function useApp() {
	return useContext(AppContext);
}
