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

export const recordKeyToIndex = (key: string) => {
    return Number(key.replace('name_', ''));
}

const recordFragment = `fragment RECORD_VALUES on DynamicField {
    value {
        ...on MoveValue {
            json
        }
    }
}`
const getRecords = (names: string[], type: string, registryAddress: string) => `
    query {
        owner(address: "${registryAddress}") {
            ${
                names.map((name, index) => {
                    return `
                    name_${index}: dynamicField(name: 
                        { 
                            type: "${type}", bcs: "${NameLabelBcsDefinition.serialize(nameToBcs(name)).toBase64()}"} 
                        ) {
                        ...RECORD_VALUES
                    }
                    `
                })
            }
        }
    }
    ${recordFragment}
`;

const resolveTypes = (types: string[]) => `
    query {
        ${types.map((type, i) => {
            return `
            type_${i}: type(type: "${type}") {
                layout
            }
            `
        })}
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
    getRecords,
    resolveTypes,
    typed: {
        getObjects
    }
}
