import { graphqlClient } from "@/services/graphql/client";
import type { ContentStatus } from "@/types/content";

export type ContentFacetSubjectType = "TAXONOMY_TAG" | "BRAND" | "PRODUCT";
export type ContentFacetProfileKind =
  | "culture_tag"
  | "topic_tag"
  | "brand"
  | "product";
export type ContentFacetKind =
  | "LOGO"
  | "IMAGE_M"
  | "PREVIEW"
  | "RANDOM_IMAGE"
  | "TEXT";

export type ContentFacetSubjectInput = {
  type: ContentFacetSubjectType;
  id: string;
  key?: string | null;
};

export type ContentFacetSlotInput = {
  kind: ContentFacetKind;
  role?: string | null;
  mediaId?: string | null;
  textValue?: string | null;
  sortOrder?: number | null;
};

export type ContentFacetMedia = {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
};

export type ContentFacetSlot = {
  id: string;
  kind: ContentFacetKind;
  role?: string | null;
  media?: ContentFacetMedia | null;
  textValue?: string | null;
  sortOrder: number;
};

export type ContentFacetProfile = {
  id: string;
  subjectType: ContentFacetSubjectType;
  subjectId: string;
  subjectKey?: string | null;
  profileKind: ContentFacetProfileKind;
  status: ContentStatus;
  revision: string;
  publishedAt?: string | null;
  slots: ContentFacetSlot[];
  createdAt: string;
  updatedAt: string;
};

export type UpsertContentFacetProfileInput = {
  subject: ContentFacetSubjectInput;
  profileKind: ContentFacetProfileKind;
  slots: ContentFacetSlotInput[];
};

const PROFILE_FIELDS = `
  id
  subjectType
  subjectId
  subjectKey
  profileKind
  status
  revision
  publishedAt
  slots {
    id
    kind
    role
    media { id url width height }
    textValue
    sortOrder
  }
  createdAt
  updatedAt
`;

export const contentFacetApi = {
  async getProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfile | null> {
    const data = await graphqlClient.request<
      { contentFacetProfile: ContentFacetProfile | null },
      { subject: ContentFacetSubjectInput }
    >({
      query: `query ContentFacetProfile($subject: ContentFacetSubjectInput!) {
        contentFacetProfile(subject: $subject) { ${PROFILE_FIELDS} }
      }`,
      variables: { subject },
      operationName: "ContentFacetProfile",
    });
    return data.contentFacetProfile;
  },

  async upsertProfile(
    input: UpsertContentFacetProfileInput,
  ): Promise<ContentFacetProfile> {
    const data = await graphqlClient.request<
      { upsertContentFacetProfile: ContentFacetProfile },
      { input: UpsertContentFacetProfileInput }
    >({
      query: `mutation UpsertContentFacetProfile($input: UpsertContentFacetProfileInput!) {
        upsertContentFacetProfile(input: $input) { ${PROFILE_FIELDS} }
      }`,
      variables: { input },
      operationName: "UpsertContentFacetProfile",
    });
    return data.upsertContentFacetProfile;
  },

  async publishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfile> {
    const data = await graphqlClient.request<
      { publishContentFacetProfile: ContentFacetProfile },
      { subject: ContentFacetSubjectInput }
    >({
      query: `mutation PublishContentFacetProfile($subject: ContentFacetSubjectInput!) {
        publishContentFacetProfile(subject: $subject) { ${PROFILE_FIELDS} }
      }`,
      variables: { subject },
      operationName: "PublishContentFacetProfile",
    });
    return data.publishContentFacetProfile;
  },

  async unpublishProfile(
    subject: ContentFacetSubjectInput,
  ): Promise<ContentFacetProfile> {
    const data = await graphqlClient.request<
      { unpublishContentFacetProfile: ContentFacetProfile },
      { subject: ContentFacetSubjectInput }
    >({
      query: `mutation UnpublishContentFacetProfile($subject: ContentFacetSubjectInput!) {
        unpublishContentFacetProfile(subject: $subject) { ${PROFILE_FIELDS} }
      }`,
      variables: { subject },
      operationName: "UnpublishContentFacetProfile",
    });
    return data.unpublishContentFacetProfile;
  },
};
