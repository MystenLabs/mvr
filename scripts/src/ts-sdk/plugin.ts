import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { BuildTransactionOptions, TransactionDataBuilder } from "@mysten/sui/transactions";
import { findTransactionBlockNames, listToRequests, NameResolutionRequest, replaceNames } from "./utils";

export type NameResolutionPlugin = {
    suiGraphqlClient: SuiGraphQLClient;
    pageSize?: number;
}

export const resolveNames = ({ suiGraphqlClient, pageSize = 10 }: NameResolutionPlugin) => async (
    transactionData: TransactionDataBuilder,
    _buildOptions: BuildTransactionOptions,
    next: () => Promise<void>
) => {
    const names = findTransactionBlockNames(transactionData);
    const batches = listToRequests(names, pageSize);

    // now we need to bulk resolve all the names + types, and replace them in the transaction data.
    const results = (await Promise.all(batches.map(batch => queryGQL(suiGraphqlClient, batch)))).reduce((acc, val) => ({ ...acc, ...val }), {});

    replaceNames(transactionData, results);
	await next();
}

const queryGQL = async (client: SuiGraphQLClient, requests: NameResolutionRequest[]) => {
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
