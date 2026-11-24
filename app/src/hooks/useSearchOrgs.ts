import { useSuiClientsContext } from "@/components/providers/client-provider";
import { isPublicName, PUBLIC_NAMES } from "@/lib/names";
import { MvrHeader } from "@/lib/utils";
import { AppQueryKeys } from "@/utils/types";
import { useQuery } from "@tanstack/react-query";

/** An organization (`@org`, `sub@org`) that has at least one linked package. */
export type OrgSummary = {
  name: string;
  /** The number of linked packages of the org. */
  packages: number;
  /**
   * The icon of one of the org's packages (a user-provided URL), used as the
   * avatar of the org. Always `null` for public names.
   */
  icon_url: string | null;
  /**
   * Whether this is a public name (e.g. `@pkg`), not an organization. The web
   * app decides this with `isPublicName` (`@/lib/names`), which also covers
   * names that do not come from this endpoint.
   */
  is_public_name?: boolean;
};

export type OrgSearchResult = {
  data: OrgSummary[];
  next_cursor: string | null;
  limit: number;
  offset?: number;
  total: number | null;
};

/**
 * The part of a search query that can match an org name: a query like
 * `@org/app` is about the `@org` org.
 */
const orgSearchTerm = (query: string) => query.trim().split("/")[0] ?? "";

/**
 * Search for organizations (by a substring of their name) in the API.
 *
 * Organizations only complement the package results, so every failure
 * (including an API that does not have the endpoint) is an empty list.
 */
export function useSearchOrgs(query: string, limit = 4) {
  const mvrEndpoint = useSuiClientsContext().mvrEndpoints.mainnet;
  const search = orgSearchTerm(query);

  return useQuery({
    queryKey: [AppQueryKeys.SEARCH_MVR_ORGS, search, limit],
    queryFn: async (): Promise<OrgSummary[]> => {
      try {
        const params = new URLSearchParams({
          search,
          // Public names are listed too, but are not organizations.
          limit: String(limit + PUBLIC_NAMES.length),
        });
        const response = await fetch(
          `${mvrEndpoint}/v1/orgs?${params.toString()}`,
          MvrHeader(),
        );
        if (!response.ok) return [];

        const result = (await response.json()) as OrgSearchResult;
        if (!Array.isArray(result?.data)) return [];

        return result.data
          .filter((org) => !isPublicName(org.name))
          .slice(0, limit);
      } catch {
        return [];
      }
    },
    enabled: !!search,
    retry: false,
  });
}
