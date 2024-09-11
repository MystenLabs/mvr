import { namedPackagesPlugin, Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { getActiveAddress } from "../utils";

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const NETWORK_TO_TEST: Network = process.argv[2] as Network ?? 'localnet';

const client = new SuiClient({ url: getFullnodeUrl(NETWORK_TO_TEST) });

const graphqlClient = new SuiGraphQLClient({
    url: NETWORK_TO_TEST === 'localnet' ? `http://127.0.0.1:8000/graphql` : `https://sui-${NETWORK_TO_TEST}.mystenlabs.com/graphql`
});

Transaction.registerGlobalSerializationPlugin('namedPackagesPlugin', namedPackagesPlugin({
    suiGraphQLClient: graphqlClient,
    overrides: {
        packages: { 'std@framework': '0x1' },
        types: {}
    }
}));

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

    tx.moveCall({
        target: 'std@framework::string::utf8',
        arguments: [
            tx.pure.string('Hello World')
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
