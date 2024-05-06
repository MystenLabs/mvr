import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { DotMove } from "./sdk/dot-move";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Network, getActiveAddress, getClient, sender } from "../utils";

const demo = async (network: Network) => {
    const client = new SuiClient({
        url: getFullnodeUrl(network),
    });
    let DotMoveClient = new DotMove(client);

    const txb = new TransactionBlock();

    const nft = txb.moveCall({
        target: `demo-nft@demos::demo::new_nft`
    });

    txb.moveCall({
        target: `demo-nft@demos::demo::noop_w_type_param`,
        typeArguments: [
            `demo-nft@demos::demo::DemoWitness`
        ]
    });

    txb.moveCall({
        target: `demo-nft@demos::demo::noop_w_type_param`,
        typeArguments: [
            `demo-nft@demos::demo::NestedDemoWitness<demo-nft@demos::demo::DemoWitness>`
        ]
    });

    txb.transferObjects([nft], sender(txb));

    const newTx = await DotMoveClient.prepareTransactionBlock(txb);

    // setting the sender so we can dry-run and see it works!
    newTx.setSender(getActiveAddress());

    const res = await getClient(network).dryRunTransactionBlock({
        transactionBlock: await newTx.build({
            client: getClient(network),
        })
    });

    console.dir(res.effects);
}

demo('testnet');
