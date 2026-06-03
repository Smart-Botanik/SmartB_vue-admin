import type { TaxonomyTag } from "@/types/content";

/** Корневой namespace по разделу (намеренные корни иерархии). */
export function isIntentionalRoot(tag: TaxonomyTag, scopeKey: string): boolean {
  if (scopeKey === "crop") {
    return tag.namespace === "CROP";
  }
  if (scopeKey === "guides") {
    return tag.namespace === "TOPIC";
  }
  return !tag.parentId;
}

export function flattenForest(forest: TaxonomyTag[]): TaxonomyTag[] {
  const rows: TaxonomyTag[] = [];
  const walk = (nodes: TaxonomyTag[]) => {
    for (const node of nodes) {
      rows.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(forest);
  return rows;
}
