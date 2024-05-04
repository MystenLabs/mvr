// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Root } from './root';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Root />,
		children: [
			{
				path: '/',
				element: <Navigate to="df-viewer" replace />,
			},
		],
	},
]);
