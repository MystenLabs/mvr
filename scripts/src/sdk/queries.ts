import { bcs } from "@mysten/sui.js/bcs";
import { graphql } from "@mysten/sui.js/graphql/schemas/2024-01";

const NameLabelBcsDefinition = bcs.struct('Label', {
    labels: bcs.vector(bcs.string()),
    normalized: bcs.string()
});

const nameToBcs = (name: string) => {
    const labels = name.split('@').reverse();
    return {
        labels,
        normalized: name
    }
}

export const nameToValidGraphqlName = (name: string) => {
    return name.replaceAll('-', '_').replace('@', '__')
}

export const graphqlNameToDotMoveName = (name: string) => {
    return name.replace('__', '@').replaceAll('_', '-')
}

export const GetAppRecords = (names: string[], type: string, registryAddress: string) => `
    query {
        owner(address: "${registryAddress}") {
            ${
                names.map((name) => {
                    return `
                    ${nameToValidGraphqlName(name)}: dynamicField(name: { type: "${type}", bcs: "${NameLabelBcsDefinition.serialize(nameToBcs(name)).toBase64()}"} ) {
                        value {
                            ...on MoveValue {
                              json
                            }
                          }
                    }
                    `
                })
            }
        }
    }
`;

export const getObjects = graphql(`
query multiGetObjects(
	$ids: [SuiAddress!]!
	$limit: Int
	$cursor: String
) {
	objects(first: $limit, after: $cursor, filter: { objectIds: $ids }) {
		pageInfo {
			hasNextPage
			endCursor
		}
        nodes {
            asMoveObject {
              contents {
                json
              }
            }
        }
	}
}`)


export const GraphqlQueries = {
    getRecords: GetAppRecords,
    typed: {
        getObjects
    }
}
