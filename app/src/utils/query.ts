import { SuiClient, SuiObjectDataFilter, SuiObjectDataOptions } from "@mysten/sui/client";

export const fetchAllOwnedObjects = async ({
  client,
  address,
  filter,
  options = { showContent: true }
}: {
  client: SuiClient;
  address: string;
  filter: SuiObjectDataFilter;
  options?: SuiObjectDataOptions;
}) => {
  const caps = [];
  let hasNextPage = true;
  let nextCursor = undefined;

  while (hasNextPage) {
    const res = await client.getOwnedObjects({
      owner: address,
      filter,
      cursor: nextCursor,
      options: {
        showContent: true,
      },
    });

    if (!res) break;
    if (!res.data) break;
    caps.push(...res.data);
    hasNextPage = res.hasNextPage;
    nextCursor = res.nextCursor;
  }

  return caps;
};
