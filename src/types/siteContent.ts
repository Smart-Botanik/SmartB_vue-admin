export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SitePage = {
  id: string;
  key: string;
  title: string;
  sections: unknown;
  status: ContentStatus;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  createdAt: string;
  updatedAt: string;
};
