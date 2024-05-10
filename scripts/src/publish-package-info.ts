import { TransactionBlock } from "@mysten/sui.js/transactions"
import { Network, getClient, parseCorePackageObjects, parseCreatedObject, publishPackage, signAndExecute } from "../utils";
import path from "path";
import { writeFileSync } from "fs";

const DISPLAY = {
	name: 'Package Info',
	description: 'This object contains metadata about a package',
	image_url: `data:image/svg+xml,%3Csvg fill='none' viewBox='0 0 1000 1000' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23a)'%3E%3Crect width='1000' height='1000' fill='%23{style.background_color}'/%3E%3Cpath d='m630.75 856.77-262.5-151.38' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3Cpath d='m762 1049.3v-233.33c-0.011-10.229-2.711-20.276-7.83-29.133-5.119-8.856-12.478-16.21-21.337-21.325l-204.17-116.67c-8.868-5.12-18.927-7.815-29.167-7.815s-20.299 2.695-29.167 7.815l-204.17 116.67c-8.859 5.115-16.218 12.469-21.337 21.325-5.119 8.857-7.82 18.904-7.83 29.133v233.33c0.01 10.23 2.711 20.28 7.83 29.14 5.119 8.85 12.478 16.21 21.337 21.32l204.17 116.67c8.868 5.12 18.927 7.81 29.167 7.81s20.299-2.69 29.167-7.81l204.17-116.67c8.859-5.11 16.218-12.47 21.337-21.32 5.119-8.86 7.819-18.91 7.83-29.14z' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3Cpath d='m244.88 785.61 254.62 147.29 254.62-147.29' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3Ctext x='500' y='112.136' fill='%23{style.package_color}' font-family='Verdana' font-size='32' font-weight='bold' letter-spacing='0em' text-anchor='middle' style='white-space:pre' xml:space='preserve'%3EPackage Info%3C/text%3E%3Ctext x='500' y='154.545' fill='%23{style.package_color}' fill-opacity='.6' font-family='Verdana' font-size='18' font-weight='bold' letter-spacing='0em' text-anchor='middle' style='white-space:pre' xml:space='preserve'%3E{upgrade_cap_id}%3C/text%3E%3Ctext x='500' y='450.591' fill='%23{style.title_color}' font-family='Verdana' font-size='102' font-weight='bold' letter-spacing='0em' text-anchor='middle' style='white-space:pre' xml:space='preserve'%3E{label.title}%3C/text%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='a'%3E%3Crect width='1e3' height='1e3' fill='%23fff'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E%0A`,
	creator: 'ml',
};

export type CorePackageData = {
    packageId: string;
    upgradeCap: string;
    publisher: string;
}

export const publish = async (network: Network) => {
    const txb = new TransactionBlock();
    publishPackage(txb, path.resolve(__dirname, '../../packages/package_info'), network);
    const res = await signAndExecute(txb, network);
    console.dir(res);

    const { packageId, upgradeCap } = parseCorePackageObjects(res);

    const publisher = parseCreatedObject(res, '0x2::package::Publisher');

    const results = {
        packageId, upgradeCap,  publisher,
    }

    writeFileSync(path.resolve(__dirname + `/../package-info.${network}.json`), JSON.stringify(results, null, 2));
    await setupPackageInfoDisplay(results, network);
}

export const setupPackageInfoDisplay = async (data: CorePackageData, network: Network) => {
    const TYPE = `${data.packageId}::package_info::PackageInfo`;
    const txb = new TransactionBlock();

	// Create a new Display object using the publisher object and the fields.
	let display = txb.moveCall({
		target: '0x2::display::new_with_fields',
		arguments: [
			txb.object(data.publisher),
			txb.pure(Object.keys(DISPLAY)),
			txb.pure(Object.values(DISPLAY)),
		],
		typeArguments: [TYPE],
	});

	// Bump the version. This causes the Display to update on-chain (so all objects of type T will be fetched with this configuration).
	txb.moveCall({
		target: '0x2::display::update_version',
		arguments: [display],
		typeArguments: [TYPE],
	});

	// Transfer the Display object back to the owner.
	txb.transferObjects(
		[display],
		txb.moveCall({
			target: '0x2::tx_context::sender',
		}),
	);

	const res = await signAndExecute(txb, network);
    console.log(res);
}

// publish('mainnet');
// setupPackageInfoDisplay({ packageId: '7d46caec25163a18b3eb0b834789c415d45075c0b3e619036d9d6fe3fe6c3aaf', upgradeCap: '', publisher: '0xba646d3ddb04b7f8866d94a1c54e59e4673a67fe68f706b2ddf33508df984f4a'}, 'testnet');
