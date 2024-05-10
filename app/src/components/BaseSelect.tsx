// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Select } from '@radix-ui/themes';

/**
 * A simple select component that allows the user to select anything from a list.
 */
export function BaseSelect({
	value,
	setValue,
	options,
	triggerClasses,
}: {
	value: string;
	setValue: (val: string) => void;
	options: string[];
	triggerClasses?: string;
}) {
	return (
		<Select.Root value={value} onValueChange={setValue}>
			<Select.Trigger className={triggerClasses || ''} />
			<Select.Content>
				<Select.Group>
					<Select.Label>Select an option</Select.Label>
					{options.map((option) => (
						<Select.Item key={option} value={option}>
							{option}
						</Select.Item>
					))}
				</Select.Group>
			</Select.Content>
		</Select.Root>
	);
}
