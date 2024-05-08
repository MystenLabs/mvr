import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { DotMove } from "./sdk/dot-move";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Network, getActiveAddress, getClient, sender } from "../utils";

const demo = async (network: Network) => {
    const DotMoveClient = new DotMove({
        activeGraphqlEndpoint: `https://sui-${network}.mystenlabs.com/graphql`
    });
    const txb = new TransactionBlock();

    const nft = txb.moveCall({
        target: `nft@demos::demo::new_nft`
    });

    txb.moveCall({
        target: `nft@demos::demo::noop_w_type_param`,
        typeArguments: [
            `nft@demos::demo::DemoWitness`
        ]
    });

    txb.moveCall({
        target: `nft@demos::demo::noop_w_type_param`,
        typeArguments: [
            `nft@demos::demo::NestedDemoWitness<demo-nft@demos::demo::DemoWitness>`
        ]
    });
    txb.transferObjects([nft], sender(txb));

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

demo('testnet');
