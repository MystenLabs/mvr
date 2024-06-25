import { DotMoveClient, resolveDotMoveNames } from "./sdk/dot-move";
import { getActiveAddress } from "../utils";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

type Network = 'mainnet' | 'testnet' | 'devnet';

const NETWORK_TO_TEST: Network = process.argv[2] as Network ?? 'testnet';
const client = new SuiClient({
    url: getFullnodeUrl(NETWORK_TO_TEST)
});

const dotMoveClient = new DotMoveClient({
    activeGraphqlEndpoint: `https://sui-${NETWORK_TO_TEST}.mystenlabs.com/graphql`,
    network: NETWORK_TO_TEST
});

const demo = async () => {
    const tx = new Transaction();
    tx.addSerializationPlugin(resolveDotMoveNames({ dotMoveClient }));

    const nft = tx.moveCall({
        target: `nft@sample::demo::new_nft`
    });

    tx.moveCall({
        target: `nft@sample::demo::noop_w_type_param`,
        typeArguments: [
            `nft@sample::demo::DemoWitness`
        ]
    });

    tx.moveCall({
        target: `nft@sample::demo::noop_w_type_param`,
        typeArguments: [
            `nft@sample::demo::NestedDemoWitness<nft@sample::demo::DemoWitness>`
        ]
    });

    tx.transferObjects([nft], normalizeSuiAddress('0x2'));

    // setting the sender so we can dry-run and see it works!
    tx.setSender(getActiveAddress());

    const res = await client.dryRunTransactionBlock({
        transactionBlock: await tx.build({
            client
        })
    });
    console.dir(res.effects);
}

demo();
