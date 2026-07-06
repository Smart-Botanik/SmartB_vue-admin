import { graphqlClient } from "@/services/graphql/client";
import type { ContentStatus, CropGuide, CropKind, TaxonomyTag } from "@/types/content";

const TAXONOMY_TAG_FIELDS = `
  id scopeKey key namespace label sortOrder parentId cropKind variantAxis status
  parent { id key label }
`;

const GUIDE_FIELDS = `
  id cropKind slug title excerpt body bodySiteMd bodySiteMdResolved bodyTelegramMd
  cover { id url width height }
  taxonomyTags { ${TAXONOMY_TAG_FIELDS} }
  status publishedAt seoTitle seoDescription sortOrder
  telegramPublishedAt telegramMessageId telegramPostUrl
  createdAt updatedAt
`;

export type CreateCropGuideInput = {
  cropKind: CropKind;
  slug: string;
  title: string;
  excerpt?: string | null;
  bodySiteMd?: string | null;
  bodyTelegramMd?: string | null;
  coverMediaId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sortOrder?: number | null;
  taxonomyTagIds?: string[] | null;
};

export type UpdateCropGuideInput = {
  cropKind?: CropKind | null;
  slug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  bodySiteMd?: string | null;
  bodyTelegramMd?: string | null;
  coverMediaId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  sortOrder?: number | null;
  taxonomyTagIds?: string[] | null;
};

export const cropGuideApi = {
  async listGuides(params: {
    limit?: number;
    offset?: number;
    cropKind?: CropKind;
    status?: ContentStatus;
    query?: string;
  }): Promise<{ total: number; items: CropGuide[] }> {
    const data = await graphqlClient.request<
      { cropGuides: { total: number; items: CropGuide[] } },
      typeof params
    >({
      query: `query CropGuides($limit: Int, $offset: Int, $cropKind: CropKind, $status: ContentStatus, $query: String) {
        cropGuides(limit: $limit, offset: $offset, cropKind: $cropKind, status: $status, query: $query) {
          total
          items { ${GUIDE_FIELDS} }
        }
      }`,
      variables: params,
      operationName: "CropGuides",
    });
    return data.cropGuides;
  },

  async getGuide(id: string): Promise<CropGuide | null> {
    const data = await graphqlClient.request<
      { cropGuide: CropGuide | null },
      { id: string }
    >({
      query: `query CropGuide($id: ID!) {
        cropGuide(id: $id) { ${GUIDE_FIELDS} }
      }`,
      variables: { id },
      operationName: "CropGuide",
    });
    return data.cropGuide;
  },

  async createGuide(input: CreateCropGuideInput): Promise<CropGuide> {
    const data = await graphqlClient.request<
      { createCropGuide: CropGuide },
      { input: CreateCropGuideInput }
    >({
      query: `mutation CreateCropGuide($input: CreateCropGuideInput!) {
        createCropGuide(input: $input) { ${GUIDE_FIELDS} }
      }`,
      variables: { input },
      operationName: "CreateCropGuide",
    });
    return data.createCropGuide;
  },

  async updateGuide(id: string, input: UpdateCropGuideInput): Promise<CropGuide> {
    const data = await graphqlClient.request<
      { updateCropGuide: CropGuide },
      { id: string; input: UpdateCropGuideInput }
    >({
      query: `mutation UpdateCropGuide($id: ID!, $input: UpdateCropGuideInput!) {
        updateCropGuide(id: $id, input: $input) { ${GUIDE_FIELDS} }
      }`,
      variables: { id, input },
      operationName: "UpdateCropGuide",
    });
    return data.updateCropGuide;
  },

  async deleteGuide(id: string): Promise<boolean> {
    const data = await graphqlClient.request<
      { deleteCropGuide: boolean },
      { id: string }
    >({
      query: `mutation DeleteCropGuide($id: ID!) { deleteCropGuide(id: $id) }`,
      variables: { id },
      operationName: "DeleteCropGuide",
    });
    return data.deleteCropGuide;
  },

  async publishGuide(id: string): Promise<CropGuide> {
    const data = await graphqlClient.request<
      { publishCropGuide: CropGuide },
      { id: string }
    >({
      query: `mutation PublishCropGuide($id: ID!) {
        publishCropGuide(id: $id) { ${GUIDE_FIELDS} }
      }`,
      variables: { id },
      operationName: "PublishCropGuide",
    });
    return data.publishCropGuide;
  },

  async unpublishGuide(id: string): Promise<CropGuide> {
    const data = await graphqlClient.request<
      { unpublishCropGuide: CropGuide },
      { id: string }
    >({
      query: `mutation UnpublishCropGuide($id: ID!) {
        unpublishCropGuide(id: $id) { ${GUIDE_FIELDS} }
      }`,
      variables: { id },
      operationName: "UnpublishCropGuide",
    });
    return data.unpublishCropGuide;
  },

  async publishGuideToTelegram(
    id: string,
    channelId?: string | null,
  ): Promise<{
    success: boolean;
    message?: string | null;
    telegramMessageId?: string | null;
    telegramPostUrl?: string | null;
    cropGuide: CropGuide;
  }> {
    const data = await graphqlClient.request<
      {
        publishCropGuideToTelegram: {
          success: boolean;
          message?: string | null;
          telegramMessageId?: string | null;
          telegramPostUrl?: string | null;
          cropGuide: CropGuide;
        };
      },
      { id: string; channelId?: string | null }
    >({
      query: `mutation PublishCropGuideToTelegram($id: ID!, $channelId: ID) {
        publishCropGuideToTelegram(id: $id, channelId: $channelId) {
          success
          message
          telegramMessageId
          telegramPostUrl
          cropGuide { ${GUIDE_FIELDS} }
        }
      }`,
      variables: { id, channelId: channelId ?? undefined },
      operationName: "PublishCropGuideToTelegram",
    });
    return data.publishCropGuideToTelegram;
  },

  async listTaxonomyTags(params: {
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: TaxonomyTag[] }> {
    const data = await graphqlClient.request<
      { taxonomyTags: { total: number; items: TaxonomyTag[] } },
      typeof params
    >({
      query: `query TaxonomyTags($limit: Int, $offset: Int) {
        taxonomyTags(limit: $limit, offset: $offset) {
          total
          items { ${TAXONOMY_TAG_FIELDS} }
        }
      }`,
      variables: params,
      operationName: "TaxonomyTags",
    });
    return data.taxonomyTags;
  },
};
