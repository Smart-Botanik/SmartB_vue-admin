import { hierarchy, tree } from "d3-hierarchy";
import type { HierarchyPointLink, HierarchyPointNode } from "d3-hierarchy";

import type { TaxonomyTag, TaxonomyTagNamespace } from "@/types/content";

export type TaxonomyTreeHierarchyDatum = {
  tag: TaxonomyTag;
  children?: TaxonomyTreeHierarchyDatum[];
};

export function taxonomyTagsToHierarchyData(
  roots: TaxonomyTag[],
): TaxonomyTreeHierarchyDatum[] {
  const mapNode = (tag: TaxonomyTag): TaxonomyTreeHierarchyDatum => {
    const children = tag.children?.length
      ? tag.children.map(mapNode)
      : undefined;
    return { tag, children };
  };
  return roots.map(mapNode);
}

export function buildTaxonomyTreeLayout(
  roots: TaxonomyTag[],
  nodeSize: { x: number; y: number },
): {
  nodes: HierarchyPointNode<TaxonomyTreeHierarchyDatum>[];
  links: HierarchyPointLink<TaxonomyTreeHierarchyDatum>[];
  width: number;
  height: number;
} {
  const virtualRootTag: TaxonomyTag = {
    id: "__root__",
    scopeKey: "",
    key: "",
    namespace: "TOPIC" as TaxonomyTagNamespace,
    label: "",
    sortOrder: 0,
  };
  const virtualRootDatum: TaxonomyTreeHierarchyDatum = {
    tag: virtualRootTag,
    children: taxonomyTagsToHierarchyData(roots),
  };
  const virtualRoot = hierarchy(virtualRootDatum);

  const layout = tree<TaxonomyTreeHierarchyDatum>().nodeSize([
    nodeSize.y,
    nodeSize.x,
  ]);
  const laidOut = layout(virtualRoot);

  const nodes = laidOut
    .descendants()
    .filter(node => node.data.tag.id !== "__root__");
  const links = laidOut
    .links()
    .filter(link => link.source.data.tag.id !== "__root__");

  const xs = nodes.map(node => node.y);
  const ys = nodes.map(node => node.x);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 0);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 0);

  return {
    nodes,
    links,
    width: maxX - minX + nodeSize.x * 2,
    height: maxY - minY + nodeSize.y * 2,
  };
}

export function truncateTreeLabel(label: string, maxLen = 28): string {
  const trimmed = label.trim();
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
