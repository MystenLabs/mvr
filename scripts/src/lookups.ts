import { DotMove } from "./sdk/dot-move";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Network, getActiveAddress, getClient, sender } from "../utils";

const demo = async (network: 'mainnet' | 'testnet' | 'devnet') => {
    const DotMoveClient = new DotMove({
        activeGraphqlEndpoint: `https://sui-${network}.mystenlabs.com/graphql`,
        network
    });
    const txb = new TransactionBlock();
    const nft = txb.moveCall({
        target: `nft@sample::demo::new_nft`
    });
    const nft2 = txb.moveCall({
        target: `nft@sample::demo::new_nft`
    });
    const nft3 = txb.moveCall({
        target: `nft@sample::demo::new_nft`
    });

    txb.moveCall({
        target: `nft@sample::demo::noop_w_type_param`,
        typeArguments: [
            `nft@sample::demo::DemoWitness`
        ]
    });

    txb.moveCall({
        target: `nft@sample::demo::noop_w_type_param`,
        typeArguments: [
            `nft@sample::demo::NestedDemoWitness<nft@sample::demo::DemoWitness>`
        ]
    });

    txb.transferObjects([nft, nft2, nft3], sender(txb));
    // setting the sender so we can dry-run and see it works!
    txb.setSender(getActiveAddress());
    const resolvedTxb = await DotMoveClient.prepareTransactionBlock(txb);

    const res = await getClient(network).dryRunTransactionBlock({
        transactionBlock: await resolvedTxb.build({
            client: getClient(network),
        })
    });

    console.dir(res.effects);
}

demo('mainnet');
