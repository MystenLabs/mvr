import { useSuiClientsContext } from "@/components/providers/client-provider";
import { usePackagesNetwork } from "@/components/providers/packages-provider";
import { fetchAllDynamicFields } from "@/utils/query";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

export type GitVersion = {
    action?: 'add' | 'update' | 'delete';
    version: number;
    repository: string;
    path: string;
    tag: string;
}

export function useVersionsTable(tableId: string) {
  const selectedNetwork = usePackagesNetwork();
  const clients = useSuiClientsContext();

  const client = clients[selectedNetwork];

  return useQuery({
    queryKey: [AppQueryKeys.VERSIONS_TABLE, tableId],

    queryFn: async () => {
        return fetchAllDynamicFields({
            client,
            tableId,
        });
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select(data) {

        const versions: GitVersion[] = [];
        for (const field of data) {
            if (field.data?.content?.dataType !== 'moveObject') continue;
            const fields = field.data.content.fields as Record<string, any>;
            const version = parseInt(fields.name);
            const data = fields.value.fields;

            versions.push({
                version,
                repository: data.repository,
                path: data.path,
                tag: data.tag,
            });
        }

        return versions;
    },
    enabled: !!tableId,
  });
}
