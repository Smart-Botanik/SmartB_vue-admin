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

/** Культура = корневой CROP; подвид = дочерний CROP_VARIANT под crop.* */
export function defaultNamespaceForCreate(
  scopeKey: string,
  parentId: string | null,
): "CROP" | "CROP_VARIANT" | "TOPIC" {
  if (parentId) {
    return "CROP_VARIANT";
  }
  if (scopeKey === "crop") {
    return "CROP";
  }
  return "TOPIC";
}

export function isNamespaceLocked(scopeKey: string, parentId: string | null): boolean {
  return scopeKey === "crop" || parentId !== null || scopeKey === "guides";
}

export function createTagModalTitle(scopeKey: string, parentId: string | null): string {
  if (parentId) {
    return scopeKey === "crop" ? "Новый подвид / тип" : "Новый подтег";
  }
  if (scopeKey === "crop") {
    return "Новая культура";
  }
  return "Новый корневой тег";
}

export function rootCreateButtonLabel(scopeKey: string): string {
  if (scopeKey === "crop") {
    return "Культура";
  }
  return "Корневой тег";
}

export function childCreateButtonLabel(scopeKey: string): string {
  return scopeKey === "crop" ? "Подвид" : "Подтег";
}

export function hierarchyHint(scopeKey: string): string {
  if (scopeKey === "crop") {
    return "Культура — корневой тег (namespace CROP, ключ crop.*). Подвид / тип — дочерние теги под выбранной культурой (CROP_VARIANT).";
  }
  return "Корневые теги задают тип в разделе; вложенные — уточнения под родителем.";
}

/** Родители для «назначить группу»: культуры (CROP) в crop, корни TOPIC в guides. */
export function cultureParentOptions(
  flatTags: TaxonomyTag[],
  scopeKey: string,
): Array<{ value: string; label: string }> {
  if (scopeKey === "crop") {
    return flatTags
      .filter((tag) => tag.namespace === "CROP")
      .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
  }
  if (scopeKey === "guides") {
    return flatTags
      .filter((tag) => tag.namespace === "TOPIC" && !tag.parentId)
      .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
  }
  return flatTags
    .filter((tag) => (tag.childIds?.length ?? tag.children?.length ?? 0) > 0)
    .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
}
