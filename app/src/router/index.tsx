// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createBrowserRouter } from 'react-router-dom';
import { Root } from './root';
import { Packages } from '@/pages/packages';
import { PackageInfo } from '@/pages/package-info';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
		children: [
			{
				path: '/packages',
				element:  <Packages/>,
			},
			{
				path: '/packages/:id',
				element: <PackageInfo/>,
			},
		],
	},
	
]);
