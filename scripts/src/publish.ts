import {
  Network,
  getClient,
  parseCorePackageObjects,
  parseCreatedObject,
  publishPackage,
  signAndExecute,
} from "../utils";
import path from "path";
import { readFileSync, writeFileSync } from "fs";
import { Transaction } from "@mysten/sui/transactions";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const DISPLAY = {
  name: "{display.title}",
  description:
    "The capability that manages a Move Registry (mvr) name. If mainnet is connected, both the capability and the record are immutable.",
  image_url: "",
};

export type CorePackageData = {
  packageId: string;
  upgradeCap: string;
  publisher: string;
  appRegistry: string;
  appRegistryTable: string;
};

const processMVRSvg = () => {
  const file = readFileSync(__dirname + "/../mvr-cap-display.svg", "utf8");

  const encodedSVG = encodeURIComponent(file)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22")
    .replace(/#/g, "%23");

  let dataUrl = `data:image/svg+xml;charset=UTF-8,${encodedSVG}`;

  dataUrl = dataUrl
    .replace("REPLACE_ME_WITH_TEXT", "{display.uri_encoded_text}")
    .replace("REPLACE_ME_WITH_OPACITY", "{display.link_opacity}");

  return dataUrl;
};

export const publishDotMove = async (
  network: Network,
  clientConfigPath: string
) => {
  const client = getClient(network);
  const txb = new Transaction();
  publishPackage(
    txb,
    path.resolve(__dirname, "../../packages/mvr"),
    clientConfigPath
  );

  const res = await signAndExecute(txb, network);

  const { packageId, upgradeCap } = parseCorePackageObjects(res);

  const publisher = parseCreatedObject(res, "0x2::package::Publisher");
  const appRegistry = parseCreatedObject(
    res,
    `${packageId}::move_registry::MoveRegistry`
  );

  await delay(2000);

  const appRegistrydata = await client.getObject({
    id: appRegistry,
    options: {
      showContent: true,
    },
  });

  const appRegistryContent = appRegistrydata.data?.content as Record<
    string,
    any
  >;

  const appRegistryTable = appRegistryContent.fields.registry.fields.id.id;

  const results = {
    packageId,
    upgradeCap,
    publisher,
    appRegistry,
    appRegistryTable,
  };

  writeFileSync(
    path.resolve(__dirname + `/../published.${network}.json`),
    JSON.stringify(results, null, 2)
  );

  await delay(2000);

  setupMVRDisplay(results, network);

  const dotMoveGraphqlToml = `[move-registry]
package-address = "${packageId}"
registry-id = "${appRegistryTable}"
`;

  const gqlConfigName = __dirname + `/../graphql.${network}.config.toml`;
  writeFileSync(path.resolve(gqlConfigName), dotMoveGraphqlToml);
  console.log("GraphQL Config file saved at: " + path.resolve(gqlConfigName));

  return results;
};

export const setupMVRDisplay = async (
  data: CorePackageData,
  network: Network
) => {
  const TYPE = `${data.packageId}::app_record::AppCap`;
  const txb = new Transaction();

  DISPLAY.image_url = processMVRSvg();

  // Create a new Display object using the publisher object and the fields.
  let display = txb.moveCall({
    target: "0x2::display::new_with_fields",
    arguments: [
      txb.object(data.publisher),
      txb.pure.vector("string", Object.keys(DISPLAY)),
      txb.pure.vector("string", Object.values(DISPLAY)),
    ],
    typeArguments: [TYPE],
  });

  // Bump the version. This causes the Display to update on-chain (so all objects of type T will be fetched with this configuration).
  txb.moveCall({
    target: "0x2::display::update_version",
    arguments: [display],
    typeArguments: [TYPE],
  });

  // Transfer the Display object back to the owner.
  txb.transferObjects(
    [display],
    txb.moveCall({
      target: "0x2::tx_context::sender",
    })
  );

  const res = await signAndExecute(txb, network);
  // wait until we've seen the transaction on-chain.
  await getClient(network).waitForTransaction({ digest: res.digest });
  return res;
};
