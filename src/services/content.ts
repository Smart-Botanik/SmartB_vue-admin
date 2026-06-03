import { graphqlClient } from "@/services/graphql/client";
import type {
  TaxonomyGroupDeleteStrategy,
  TaxonomyScope,
  TaxonomyTag,
  TaxonomyTagNamespace,
  TaxonomyTagStatus,
} from "@/types/content";

const TAXONOMY_TAG_FIELDS = `
  id scopeKey key namespace label sortOrder parentId cropKind variantAxis status childIds
  parent { id key label }
`;

const TAXONOMY_TAG_TREE_FIELDS = `
  id scopeKey key namespace label sortOrder parentId cropKind variantAxis status childIds
  children {
    id scopeKey key namespace label sortOrder parentId status childIds
    children {
      id key label sortOrder parentId status childIds
    }
  }
`;

export type CreateTaxonomyScopeInput = {
  key: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
};

export type CreateTaxonomyTagInput = {
  scopeKey: string;
  key: string;
  namespace: TaxonomyTagNamespace;
  label: string;
  sortOrder?: number;
  parentId?: string | null;
  cropKind?: string | null;
  variantAxis?: string | null;
  status?: TaxonomyTagStatus | null;
};

export type UpdateTaxonomyTagInput = {
  key?: string | null;
  namespace?: TaxonomyTagNamespace | null;
  label?: string | null;
  sortOrder?: number | null;
  parentId?: string | null;
  cropKind?: string | null;
  variantAxis?: string | null;
  status?: TaxonomyTagStatus | null;
};

export const contentService = {
  async listTaxonomyScopes() {
    const data = await graphqlClient.request<{ taxonomyScopes: TaxonomyScope[] }>({
      query: `query TaxonomyScopes { taxonomyScopes { key label description sortOrder } }`,
      operationName: "TaxonomyScopes",
    });
    return data.taxonomyScopes;
  },

  async createTaxonomyScope(input: CreateTaxonomyScopeInput) {
    const data = await graphqlClient.request<
      { createTaxonomyScope: TaxonomyScope },
      { input: CreateTaxonomyScopeInput }
    >({
      query: `mutation CreateTaxonomyScope($input: CreateTaxonomyScopeInput!) {
        createTaxonomyScope(input: $input) { key label description sortOrder }
      }`,
      variables: { input },
      operationName: "CreateTaxonomyScope",
    });
    return data.createTaxonomyScope;
  },

  async taxonomyForest(scopeKey: string) {
    const data = await graphqlClient.request<
      { taxonomyForest: TaxonomyTag[] },
      { scopeKey: string }
    >({
      query: `query TaxonomyForest($scopeKey: String!) {
        taxonomyForest(scopeKey: $scopeKey) { ${TAXONOMY_TAG_TREE_FIELDS} }
      }`,
      variables: { scopeKey },
      operationName: "TaxonomyForest",
    });
    return data.taxonomyForest;
  },

  async listTaxonomyTags(params: {
    scopeKey?: string;
    parentId?: string | null;
    limit?: number;
    offset?: number;
    namespace?: TaxonomyTagNamespace;
    status?: TaxonomyTagStatus | null;
  }) {
    const data = await graphqlClient.request<
      { taxonomyTags: { total: number; items: TaxonomyTag[] } },
      typeof params
    >({
      query: `query TaxonomyTags(
        $scopeKey: String
        $parentId: ID
        $limit: Int
        $offset: Int
        $namespace: TaxonomyTagNamespace
        $status: TaxonomyTagStatus
      ) {
        taxonomyTags(
          scopeKey: $scopeKey
          parentId: $parentId
          limit: $limit
          offset: $offset
          namespace: $namespace
          status: $status
        ) {
          total
          items { ${TAXONOMY_TAG_FIELDS} }
        }
      }`,
      variables: params,
      operationName: "TaxonomyTags",
    });
    return data.taxonomyTags;
  },

  async createTaxonomyTag(input: CreateTaxonomyTagInput) {
    const data = await graphqlClient.request<
      { createTaxonomyTag: TaxonomyTag },
      { input: CreateTaxonomyTagInput }
    >({
      query: `mutation CreateTaxonomyTag($input: CreateTaxonomyTagInput!) {
        createTaxonomyTag(input: $input) { ${TAXONOMY_TAG_FIELDS} }
      }`,
      variables: { input },
      operationName: "CreateTaxonomyTag",
    });
    return data.createTaxonomyTag;
  },

  async updateTaxonomyTag(id: string, input: UpdateTaxonomyTagInput) {
    const data = await graphqlClient.request<
      { updateTaxonomyTag: TaxonomyTag },
      { id: string; input: UpdateTaxonomyTagInput }
    >({
      query: `mutation UpdateTaxonomyTag($id: ID!, $input: UpdateTaxonomyTagInput!) {
        updateTaxonomyTag(id: $id, input: $input) { ${TAXONOMY_TAG_FIELDS} }
      }`,
      variables: { id, input },
      operationName: "UpdateTaxonomyTag",
    });
    return data.updateTaxonomyTag;
  },

  async deleteTaxonomyTag(id: string) {
    const data = await graphqlClient.request<
      { deleteTaxonomyTag: boolean },
      { id: string }
    >({
      query: `mutation DeleteTaxonomyTag($id: ID!) { deleteTaxonomyTag(id: $id) }`,
      variables: { id },
      operationName: "DeleteTaxonomyTag",
    });
    return data.deleteTaxonomyTag;
  },

  async deleteTaxonomyGroup(
    id: string,
    strategy: TaxonomyGroupDeleteStrategy,
    newParentId?: string | null,
  ) {
    const data = await graphqlClient.request<
      { deleteTaxonomyGroup: boolean },
      { id: string; strategy: TaxonomyGroupDeleteStrategy; newParentId?: string | null }
    >({
      query: `mutation DeleteTaxonomyGroup(
        $id: ID!
        $strategy: TaxonomyGroupDeleteStrategy!
        $newParentId: ID
      ) {
        deleteTaxonomyGroup(id: $id, strategy: $strategy, newParentId: $newParentId)
      }`,
      variables: { id, strategy, newParentId },
      operationName: "DeleteTaxonomyGroup",
    });
    return data.deleteTaxonomyGroup;
  },
};
