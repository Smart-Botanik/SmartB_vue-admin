import { print, type DocumentNode } from "graphql";

import { graphqlClient } from "@/services/graphql/client";
import type { TAdminGqlHttpClient } from "@growing/mst-models";

function toQueryString(query: string | DocumentNode): string {
  return typeof query === "string" ? query : print(query);
}

export function createAdminGqlHttpClient(): TAdminGqlHttpClient {
  return {
    request: async <TData,>(
      query: string | DocumentNode,
      variables?: Record<string, unknown>,
    ) =>
      graphqlClient.request<TData>({
        query: toQueryString(query),
        variables: variables as Record<string, never> | undefined,
      }),
  };
}
