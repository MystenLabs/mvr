// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ConnectButton, useSuiClientContext } from '@mysten/dapp-kit';
import { Box, Container, Flex, Heading } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';

import { BaseSelect } from './BaseSelect';

const menu = [
	{
		title: 'Home',
		link: '/',
	},
];

export function Header() {
	const { network, networks, selectNetwork } = useSuiClientContext();
	const [initialSetup, setInitialSetup] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	const getQuery = () => {
		return new URLSearchParams(window.location.search).toString();
	};

	useEffect(() => {
		if (initialSetup) return;
		const queryNetwork = searchParams.get('network');
		if (queryNetwork && network !== queryNetwork) selectNetwork(queryNetwork as string);
		setInitialSetup(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	useEffect(() => {
		if (!initialSetup) return;
		if (searchParams.get('network') !== network) {
			searchParams.set('network', network);
			setSearchParams(searchParams);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [network]);

	return (
		<Container>
			<Flex position="sticky" px="4" py="2" justify="between" className="flex flex-wrap">
				<Box>
					<Heading className="flex items-center gap-3 text-blue-600">Sui Tools</Heading>
				</Box>
				<Box className="flex gap-5 items-center">
					{menu.map((item) => (
						<NavLink
							key={item.link}
							to={{ pathname: item.link, search: getQuery() }}
							className={({ isActive, isPending }) =>
								`cursor-pointer flex items-center gap-2 ${
									isPending ? 'pending' : isActive ? 'font-bold text-blue-600' : ''
								}`
							}
						>
							{item.title}
						</NavLink>
					))}

					<BaseSelect value={network} setValue={selectNetwork} options={Object.keys(networks)} />

					<div className="connect-wallet-wrapper">
						<ConnectButton />
					</div>
				</Box>
			</Flex>
		</Container>
	);
}
