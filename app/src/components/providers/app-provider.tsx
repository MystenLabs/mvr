// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
'use client';

import { SuinsName } from '@/hooks/useOrganizationList';
import { createContext, useContext } from 'react';

export type AppContextType = {
    value: {
        selectedSuinsName: SuinsName | null;
    };
    setValue: (value: AppContextType['value']) => void;
}

export const AppContext = createContext<AppContextType>({
    value: {
        selectedSuinsName: null,
    },
    setValue: () => {},
});

export function useAppState() {
	return useContext(AppContext);
}
