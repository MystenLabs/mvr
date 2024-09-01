import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { resolveNames } from "./plugin";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { getActiveAddress } from "../../utils";

type Network = 'mainnet' | 'testnet' | 'devnet';

const NETWORK_TO_TEST: Network = process.argv[2] as Network ?? 'localnet';

const client = new SuiClient({
    url: getFullnodeUrl(NETWORK_TO_TEST)
});

const graphqlClient = new SuiGraphQLClient({
    // url: `https://sui-${NETWORK_TO_TEST}.mystenlabs.com/graphql`
    url: 'http://127.0.0.1:8000/graphql'
});

Transaction.registerGlobalSerializationPlugin(resolveNames({ suiGraphqlClient: graphqlClient }));

const demo = async () => {
    const tx = new Transaction();

    const nft = tx.moveCall({
        target: `first@demo::demo::new_nft`
    });

    tx.moveCall({
        target: `first@demo::demo::noop_w_type_param`,
        typeArguments: [
            `first@demo::demo::DemoWitness`
        ]
    });

    tx.moveCall({
        target: `first@demo::demo::noop_w_type_param`,
        typeArguments: [
            `first@demo::demo::NestedDemoWitness<first@demo::demo::DemoWitness>`
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
