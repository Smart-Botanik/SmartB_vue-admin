import { graphqlClient } from "@/services/graphql/client";
import type { ContentStatus, SitePage } from "@/types/siteContent";

const SITE_PAGE_FIELDS = `
  id
  key
  title
  sections
  status
  publishedAt
  seoTitle
  seoDescription
  createdAt
  updatedAt
`;

export type UpsertSitePageInput = {
  key: string;
  title: string;
  sectionsJson: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status?: ContentStatus | null;
};

export const sitePageApi = {
  async getSitePage(key: string): Promise<SitePage | null> {
    const data = await graphqlClient.request<
      { sitePage: SitePage | null },
      { key: string }
    >({
      query: `query SitePage($key: String!) {
        sitePage(key: $key) { ${SITE_PAGE_FIELDS} }
      }`,
      variables: { key },
      operationName: "SitePage",
    });
    return data.sitePage;
  },

  async upsertSitePage(input: UpsertSitePageInput): Promise<SitePage> {
    const data = await graphqlClient.request<
      { upsertSitePage: SitePage },
      { input: UpsertSitePageInput }
    >({
      query: `mutation UpsertSitePage($input: UpsertSitePageInput!) {
        upsertSitePage(input: $input) { ${SITE_PAGE_FIELDS} }
      }`,
      variables: { input },
      operationName: "UpsertSitePage",
    });
    return data.upsertSitePage;
  },

  async publishSitePage(key: string): Promise<SitePage> {
    const data = await graphqlClient.request<
      { publishSitePage: SitePage },
      { key: string }
    >({
      query: `mutation PublishSitePage($key: String!) {
        publishSitePage(key: $key) { ${SITE_PAGE_FIELDS} }
      }`,
      variables: { key },
      operationName: "PublishSitePage",
    });
    return data.publishSitePage;
  },

  async unpublishSitePage(key: string): Promise<SitePage> {
    const data = await graphqlClient.request<
      { unpublishSitePage: SitePage },
      { key: string }
    >({
      query: `mutation UnpublishSitePage($key: String!) {
        unpublishSitePage(key: $key) { ${SITE_PAGE_FIELDS} }
      }`,
      variables: { key },
      operationName: "UnpublishSitePage",
    });
    return data.unpublishSitePage;
  },
};
