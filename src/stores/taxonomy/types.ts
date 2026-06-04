import type { TaxonomyScope, TaxonomyTag } from "@/types/content";

export type TaxonomyScopeDirectorySnapshot = {
  forestTree: TaxonomyTag[];
  ungroupedTags: TaxonomyTag[];
};

export type TaxonomyScopeSectionView = {
  scope: TaxonomyScope;
  forestTree: TaxonomyTag[];
  hierarchyRoots: TaxonomyTag[];
  ungroupedTags: TaxonomyTag[];
};
