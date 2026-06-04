import type { TaxonomyScope, TaxonomyTag } from "@/types/content";
import type { TaxonomyScopeDirectorySnapshot } from "./types";

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function sortTaxonomyScopes(scopes: TaxonomyScope[]): TaxonomyScope[] {
  return [...scopes].sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.key.localeCompare(b.key, "ru");
  });
}

export function snapshotTaxonomyForest(nodes: TaxonomyTag[]): TaxonomyTag[] {
  return nodes.map(node => {
    const children = node.children?.length
      ? snapshotTaxonomyForest(node.children)
      : undefined;
    return { ...node, children };
  });
}

/** Если API отдал childIds без children — собрать вложенность из плоского списка узлов. */
export function hydrateForestChildren(roots: TaxonomyTag[]): TaxonomyTag[] {
  const flat: TaxonomyTag[] = [];
  const walk = (list: TaxonomyTag[]) => {
    for (const node of list) {
      flat.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(roots);

  const byId = new Map<string, TaxonomyTag>();
  for (const node of flat) {
    byId.set(node.id, { ...node, children: undefined });
  }

  for (const node of byId.values()) {
    if (node.children?.length) {
      continue;
    }
    const ids = node.childIds ?? [];
    if (ids.length > 0) {
      node.children = ids
        .map(id => byId.get(id))
        .filter((child): child is TaxonomyTag => child != null)
        .map(child => ({ ...child }));
    }
  }

  return roots.map(root => byId.get(root.id) ?? root);
}

export function flattenForestSnapshot(nodes: TaxonomyTag[]): TaxonomyTag[] {
  const rows: TaxonomyTag[] = [];
  const walk = (list: TaxonomyTag[]) => {
    for (const node of list) {
      const { children, ...rest } = node;
      rows.push(rest);
      if (children?.length) {
        walk(children);
      }
    }
  };
  walk(nodes);
  return rows;
}

export function findTagScopeKey(
  scopeDirectories: Record<string, TaxonomyScopeDirectorySnapshot>,
  tagId: string,
): string | undefined {
  for (const [scopeKey, directory] of Object.entries(scopeDirectories)) {
    if (flattenForestSnapshot(directory.forestTree).some(tag => tag.id === tagId)) {
      return scopeKey;
    }
  }
  return undefined;
}
