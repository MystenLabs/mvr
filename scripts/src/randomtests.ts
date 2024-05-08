import { SuiGraphQLClient } from "@mysten/sui.js/graphql";
import { GraphqlQueries } from "./sdk/queries";
import { DotMove } from "./sdk/dot-move";


const graphQLClient = new SuiGraphQLClient({
    url: 'https://sui-mainnet.mystenlabs.com/graphql',
});

const demo = async () => {

    const dotMoveClient = new DotMove({
        activeGraphqlEndpoint: 'https://sui-mainnet.mystenlabs.com/graphql'
    });

    const res = await dotMoveClient.bulkResolveDotMoveApps(['nft@demos']);

    // const query = GraphqlQueries.getRecords(['nft@demos', 'demo-nft@demos', 'core@dotmove', 'package-info@dotmove'], '0x69c3603929f5fba7d3374d01d315841679285fa7ddf1d5600e8a2fa9402ac698::name::Name', '0x0a11ab6c88af9dd2d531ab67edda4e105bca01975d09f42c58d9772c76c63ca0');
    // const names = await graphQLClient.query(
    //     {
    //         query,
    //         variables: {}
    //     }
    // )
    // console.dir(names.data?.owner, { depth: null });

    // const names = await graphQLClient.query(GraphqlQueries.getRecords(['nft@demos'], '0x69c3603929f5fba7d3374d01d315841679285fa7ddf1d5600e8a2fa9402ac698::name::Name'));

    // console.log(names);


    // const data = await graphQLClient.getObject({
    //     id: normalizeSuiAddress('0xa4da56667d429b71eff805f0f05bb06f9d1ee4b34e02be5aa00c89e2bd6fb8f4')
    // })

    // console.log(data);
}
demo();

