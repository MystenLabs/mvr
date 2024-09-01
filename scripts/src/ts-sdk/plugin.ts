import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { BuildTransactionOptions, TransactionDataBuilder } from "@mysten/sui/transactions";
import { findTransactionBlockNames, listToRequests, NameResolutionRequest, replaceNames } from "./utils";

export type NameResolutionPlugin = {
    suiGraphqlClient: SuiGraphQLClient;
    pageSize?: number;
    /** 
     * Local overrides to the resolution plugin. Useful for CI testing.
     * 
     * Expected format is:
     * 1. For packages: `app@org` -> `0x1234`
     * 2. For types: `app@org::type::Type` -> `0x1234::type::Type`
     * 
     */
    overrides?: Record<string, string>;
}

export const resolveNames = ({ suiGraphqlClient, pageSize = 10, overrides = {} }: NameResolutionPlugin) => async (
    transactionData: TransactionDataBuilder,
    _buildOptions: BuildTransactionOptions,
    next: () => Promise<void>
) => {
    const names = findTransactionBlockNames(transactionData);
    // Remove the "overrides" from the list of names to resolve.
    names.names = names.names.filter(x => !overrides[x]);
    names.types = names.types.filter(x => !overrides[x]);

    const batches = listToRequests(names, pageSize);
    // now we need to bulk resolve all the names + types, and replace them in the transaction data.
    const results = (await Promise.all(batches.map(batch => queryGQL(suiGraphqlClient, batch))))
                .reduce((acc, val) => ({ ...acc, ...val }), {});

    replaceNames(transactionData, {...results, ...overrides});

	await next();
}

const queryGQL = async (client: SuiGraphQLClient, requests: NameResolutionRequest[]) => {
    // avoid making a request if there are no names to resolve.
    if (requests.length === 0) return {};

    // Create multiple queries for each name / type we need to resolve
    const gqlQuery = `{
        ${requests.map(req => {
            const request = req.type === 'package' ? 'packageByName' : 'typeByName';
            const fields = req.type === 'package' ? 'address' : 'repr';

            return `${gqlQueryKey(req.id)}: ${request}(name: "${req.name}") {
                    ${fields}
                }`;
            }
        )}
    }`;

    const result = await client.query({
        query: gqlQuery,
        variables: undefined
    });

    const results: Record<string, string> = {};

    // Parse the results and create a map of `<name|type> -> <address|repr>`
    for (const req of requests) {
        const key = gqlQueryKey(req.id);
        if (!result.data || !result.data[key]) throw new Error(`No result found for key: ${req.name}`);
        const data = result.data[key] as { address?: string, repr?: string };
        
        results[req.name] = req.type === 'package' ? data.address! : data.repr!;
    }

    return results;
}

const gqlQueryKey = (idx: number) => `key_${idx}`;
