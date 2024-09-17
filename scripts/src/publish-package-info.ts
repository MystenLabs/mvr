import { getClient, manageInitialPublishForPackage, Network, parseCorePackageObjects, parseCreatedObject, publishPackage, signAndExecute, sleep } from "../utils";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import { Transaction } from "@mysten/sui/transactions";

const DISPLAY = {
	name: 'Package Info',
	description: 'This object helps store metadata about a package, and remains indexable accessible from indexers. It is primarily used by Move Registry (mvr).',
	image_url: '',
};

export type CorePackageData = {
    packageId: string;
    upgradeCap: string;
    publisher: string;
}

const processSvg = () => {
	const file = readFileSync(__dirname + '/../package-info-display.svg', 'utf8');

	const encodedSVG = encodeURIComponent(file)
		.replace(/'/g, '%27')
		.replace(/"/g, '%22')
		.replace(/#/g, '%23');

	let dataUrl = `data:image/svg+xml;charset=UTF-8,${encodedSVG}`;

	dataUrl = dataUrl.replace('REPLACE_ME_WITH_TEXTS', '{display.uri_encoded_name}')
					.replace('REPLACE_ME_GRADIENT_TO', '{display.gradient_to}')
					.replace('REPLACE_ME_GRADIENT_FROM', '{display.gradient_from}');
	
	return dataUrl;
}

export const publish = async (network: Network, clientConfigPath: string) => {
	const client = getClient(network);
    const txb = new Transaction();
    publishPackage(txb, path.resolve(__dirname, '../../packages/package_info'), clientConfigPath);
    const res = await signAndExecute(txb, network);
    console.dir(res);

	await sleep(2500);

    const { packageId, upgradeCap } = parseCorePackageObjects(res);

	manageInitialPublishForPackage(path.resolve(__dirname, '../../packages/package_info'), packageId);

    const publisher = parseCreatedObject(res, '0x2::package::Publisher');
    const results = {  packageId, upgradeCap,  publisher };

    writeFileSync(path.resolve(__dirname + `/../package-info.${network}.json`), JSON.stringify(results, null, 2));
    await setupPackageInfoDisplay(results, network);
	return results;
}

export const setupPackageInfoDisplay = async (data: CorePackageData, network: Network) => {
    const TYPE = `${data.packageId}::package_info::PackageInfo`;
    const txb = new Transaction();

	DISPLAY.image_url = processSvg();

	// Create a new Display object using the publisher object and the fields.
	let display = txb.moveCall({
		target: '0x2::display::new_with_fields',
		arguments: [
			txb.object(data.publisher),
			txb.pure.vector('string', Object.keys(DISPLAY)),
			txb.pure.vector('string', Object.values(DISPLAY)),
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

	const res = await signAndExecute(txb, network,);
	// wait until we've seen the transaction on-chain.
	await getClient(network).waitForTransaction({ digest: res.digest });
	return res;
}
