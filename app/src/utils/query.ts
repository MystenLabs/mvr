import type { SuiClientTypes } from "@mysten/sui/client";
import type { SuiGrpcClient } from "@mysten/sui/grpc";

/**
 * Fetch all pages of a cursor-paginated gRPC list endpoint.
 */
export const fetchAllPages = async <T>({
  asyncFn,
}: {
  asyncFn: (cursor?: string | null) => Promise<{
    items: T[];
    hasNextPage: boolean;
    cursor?: string | null;
  }>;
}): Promise<T[]> => {
  const data: T[] = [];
  let hasNextPage = true;
  let cursor: string | null | undefined = undefined;

  while (hasNextPage) {
    const res = await asyncFn(cursor);
    if (!res || !res.items) break;
    data.push(...res.items);
    hasNextPage = res.hasNextPage;
    cursor = res.cursor;
  }

  return data;
};

/**
 * Fetch all objects of a given (fully-resolved) type owned by an address.
 * Defaults to including the BCS content so callers can parse with generated types.
 */
export const fetchAllOwnedObjects = async <
  const Include extends SuiClientTypes.ObjectInclude = { content: true },
>({
  client,
  address,
  type,
  include,
}: {
  client: SuiGrpcClient;
  address: string;
  type: string;
  include?: Include;
}): Promise<SuiClientTypes.Object<Include>[]> => {
  const inc = (include ?? { content: true }) as Include;
  return fetchAllPages<SuiClientTypes.Object<Include>>({
    asyncFn: async (cursor) => {
      const res = await client.core.listOwnedObjects({
        owner: address,
        type,
        cursor,
        include: inc,
      });
      return {
        items: res.objects,
        hasNextPage: res.hasNextPage,
        cursor: res.cursor,
      };
    },
  });
};

/**
 * Fetch all dynamic-field entries (with their BCS values) of a parent table/bag.
 *
 * USE WITH CAUTION: can be slow/expensive for large tables.
 */
export const fetchAllDynamicFields = async ({
  client,
  tableId,
}: {
  client: SuiGrpcClient;
  tableId: string;
}) => {
  return fetchAllPages({
    asyncFn: async (cursor) => {
      const res = await client.listDynamicFields({
        parentId: tableId,
        cursor,
        include: { value: true },
      });
      return {
        items: res.dynamicFields,
        hasNextPage: res.hasNextPage,
        cursor: res.cursor,
      };
    },
  });
};

// create a batch function for arrays
export const batch = <T>(arr: T[], batchSize: number) => {
  const batches = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }

  return batches;
};
