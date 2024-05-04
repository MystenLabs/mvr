// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Container } from '@radix-ui/themes';
import { Toaster } from 'react-hot-toast';
import { Outlet } from 'react-router-dom';

import { Header } from '@/components/Header';

export function Root() {
	return (
		<div>
			<Toaster position="bottom-center" />
			<Header />
			<Container py="8" className="container">
				<Outlet />
			</Container>
		</div>
	);
}
