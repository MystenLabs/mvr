import {
  DynamicFieldInfo,
  PaginatedObjectsResponse,
  SuiClient,
  SuiObjectDataFilter,
  SuiObjectDataOptions,
  SuiObjectResponse,
} from "@mysten/sui/client";

/** Max objects per page. */
const MAX_PER_PAGE = 50;

/** 
 * Fetch all pages of data from a paginated API endpoint (e.g. SuiClient.getOwnedObjects).
 */
export const fetchAllPages = async ({
  asyncFn,
}: {
  asyncFn: (cursor?: string | null) => Promise< {
    data: any[];
    hasNextPage: boolean;
    nextCursor?: string | null;
  }>;
}) => {
  const data = [];
  let hasNextPage = true;
  let nextCursor = undefined;

  while (hasNextPage) {
    const res = await asyncFn(nextCursor);
    if (!res) break;
    if (!res.data) break;
    data.push(...res.data);
    hasNextPage = res.hasNextPage;
    nextCursor = res.nextCursor;
  }

  return data;
};

/**
 * Fetch all objects owned by a given address.
 */
export const fetchAllOwnedObjects = async ({
  client,
  address,
  filter,
  options = { showContent: true, showType: true },
}: {
  client: SuiClient;
  address: string;
  filter: SuiObjectDataFilter;
  options?: SuiObjectDataOptions;
}) => {
  return await fetchAllPages({
    asyncFn: async (cursor) => {
      return client.getOwnedObjects({
        owner: address,
        filter,
        cursor,
        options,
      });
    },
  }) as SuiObjectResponse[];
};

/** 
 * Allows fetching all the DFs & the equivalent objects 
 * 
 * USE WITH CAUTION: This function can be slow and expensive (easily hitting RPC limits).
 * */
export const fetchAllDynamicFields = async ({
  client,
  tableId,
}: {
  client: SuiClient;
  tableId: string;
}) => {
  const dfPages = await fetchAllPages({
    asyncFn: async (cursor) => {
      return client.getDynamicFields({
        parentId: tableId,
        cursor,
      });
    },
  }) as DynamicFieldInfo[];

  const objectIds = dfPages.map(x => x.objectId);
  const batches = batch(objectIds, MAX_PER_PAGE);

  const objects = (await Promise.all(
    batches.map(async (batch) => {
      return await client.multiGetObjects({
        ids: batch,
        options: {
          showContent: true
        }
      })
    }),
  )).flat();
  
  return objects;
}

// create a batch function for arrays
export const batch = <T>(arr: T[], batchSize: number) => {
  const batches = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }

  return batches;
};
