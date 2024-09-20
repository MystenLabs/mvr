// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
'use client';

import { Network } from '@/utils/types';
import { createContext, useContext } from 'react';

export const PackagesNetworkContext = createContext<Network>("mainnet");

export function usePackagesNetwork() {
	return useContext(PackagesNetworkContext);
}
