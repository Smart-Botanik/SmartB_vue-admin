import type { TaxonomyScopeSectionView } from "@/stores/taxonomy/types";
import type { TaxonomyTag } from "@/types/content";
import { TAXONOMY_TAG_NAMESPACE_OPTIONS } from "@/types/content";

/** Синтетический id узла раздела в общем Data Graph (не API-тег). */
export const TAXONOMY_SCOPE_TREE_NODE_PREFIX = "taxonomy-scope:";

export function taxonomyScopeTreeNodeId(scopeKey: string): string {
  return `${TAXONOMY_SCOPE_TREE_NODE_PREFIX}${scopeKey}`;
}

export function isTaxonomyScopeTreeNode(tag: Pick<TaxonomyTag, "id">): boolean {
  return tag.id.startsWith(TAXONOMY_SCOPE_TREE_NODE_PREFIX);
}

/** Корни общего дерева: один узел на раздел, под ним — иерархия раздела. */
export function buildGlobalTaxonomyForestRoots(
  sections: TaxonomyScopeSectionView[],
): TaxonomyTag[] {
  return sections.map(section => ({
    id: taxonomyScopeTreeNodeId(section.scope.key),
    scopeKey: section.scope.key,
    key: section.scope.key,
    namespace: "TOPIC",
    label: section.scope.label,
    sortOrder: section.scope.sortOrder,
    children: section.hierarchyRoots,
  }));
}

function isGuidesScope(scopeKey: string): boolean {
  return scopeKey === "guides" || scopeKey === "guide";
}

/** Удаление через модалку группы: есть подтеги или корневой узел раздела. */
export function isDeletableAsGroup(tag: TaxonomyTag, scopeKey: string): boolean {
  if ((tag.childIds?.length ?? tag.children?.length ?? 0) > 0) {
    return true;
  }
  return isIntentionalRoot(tag, scopeKey);
}

/** Корневой тег раздела: в иерархии, не в «несгруппированных». */
export function isIntentionalRoot(tag: TaxonomyTag, scopeKey: string): boolean {
  if (tag.parentId != null) {
    return false;
  }
  if (scopeKey === "crop") {
    return tag.namespace === "CROP";
  }
  if (isGuidesScope(scopeKey)) {
    return tag.namespace === "TOPIC";
  }
  return tag.parentId == null;
}

/** Ant Design Tree Table: пустой `children: []` иногда скрывает строку — для листьев omit. */
export function normalizeTaxonomyTreeForTable(tags: TaxonomyTag[]): TaxonomyTag[] {
  return tags.map(tag => {
    const children = tag.children?.length
      ? normalizeTaxonomyTreeForTable(tag.children)
      : undefined;
    return { ...tag, children };
  });
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

/** Корень crop = CROP; подтеги crop = CROP_VARIANT. В остальных разделах — namespace родителя. */
export function defaultNamespaceForCreate(
  scopeKey: string,
  parentId: string | null,
  parent?: Pick<TaxonomyTag, "namespace">,
): TaxonomyTag["namespace"] {
  if (parentId) {
    if (scopeKey === "crop") {
      return "CROP_VARIANT";
    }
    return parent?.namespace ?? "TOPIC";
  }
  if (scopeKey === "crop") {
    return "CROP";
  }
  if (scopeKey === "product") {
    return "PRODUCT_USE";
  }
  if (isGuidesScope(scopeKey)) {
    return "TOPIC";
  }
  return "TOPIC";
}

export function isNamespaceLocked(scopeKey: string, parentId: string | null): boolean {
  return scopeKey === "crop" || parentId !== null || scopeKey === "guides";
}

export function createTagModalTitle(_scopeKey: string, parentId: string | null): string {
  return parentId ? "Новый подтег" : "Новый корневой тег";
}

export function editTagModalTitle(tag: Pick<TaxonomyTag, "label">): string {
  return `Изменить подпись «${tag.label}»`;
}

/** Правка тега в справочнике — только подпись; ключ/тип/раздел не меняем. */
export function getEditTagLabelValidationError(label: string): string | null {
  if (!label.trim()) {
    return "Укажите подпись";
  }
  return null;
}

/** Payload для updateTaxonomyTag: только label (не смешивать с parentId / key). */
export function buildEditTagLabelInput(label: string): { label: string } {
  return { label: label.trim() };
}

export function rootCreateButtonLabel(_scopeKey: string): string {
  return "+ Добавить тег";
}

export function showVariantAxisField(
  scopeKey: string,
  namespace: TaxonomyTag["namespace"],
  parentId: string | null,
): boolean {
  return scopeKey === "crop" && namespace === "CROP_VARIANT" && parentId != null;
}

/** Подпись типа в модалке «Новый подтег» по разделу (scopeKey). */
export function createTagNamespaceDisplayLabel(
  scopeKey: string,
  namespace: TaxonomyTag["namespace"],
  hasParent: boolean,
): string {
  if (hasParent && scopeKey === "growbox") {
    return "Гроубоксы";
  }
  if (hasParent && scopeKey !== "crop") {
    return "Подтег раздела";
  }
  return (
    TAXONOMY_TAG_NAMESPACE_OPTIONS.find(option => option.value === namespace)?.label ??
    namespace
  );
}

export function childCreateButtonLabel(_scopeKey: string): string {
  return "Подтег";
}

export function hierarchyHint(scopeKey: string): string {
  if (scopeKey === "crop") {
    return "Корневые теги раздела (ключи crop.*, namespace CROP). Вложенные теги — уточнения под родителем (CROP_VARIANT).";
  }
  return "Корневые теги задают тип в разделе; вложенные — уточнения под родителем.";
}

/** Родители для «назначить группу»: корни CROP в crop, корни TOPIC в guides. */
/** Префикс полного ключа: ключ родителя или ключ раздела (scope). */
export function taxonomyCreateKeyPrefix(
  parent: Pick<TaxonomyTag, "key"> | undefined,
  scopeKey: string,
): string {
  return parent?.key ?? scopeKey;
}

/** Dot-префикс раздела для подсказок в UI (например `crop.`, `growbox.`). */
export function scopeKeyDotPrefix(scopeKey: string): string {
  return `${scopeKey}.`;
}

/** Стартовое значение поля «Ключ»: префикс с точкой (корень раздела или подтег). */
export function initialCreateTagKeyInput(
  _parentId: string | null,
  keyPrefix: string,
): string {
  return scopeKeyDotPrefix(keyPrefix);
}

type TagParentRef = Pick<TaxonomyTag, "id" | "key" | "label" | "namespace" | "parentId">;

/**
 * Полный ключ из ввода модалки и префикса. null — пусто или только префикс без сегмента.
 * При `underParent` не принимает «чужой» путь с точками (например crop.tomato.determin.* вместо crop.tomato.determinate.*).
 */
export function resolveCreateTagFullKey(
  input: string,
  keyPrefix: string,
  underParent = false,
): string | null {
  const trimmed = input.trim().replace(/^\.+/, "").replace(/\.+$/, "");
  if (!trimmed || trimmed === keyPrefix) {
    return null;
  }
  const prefixWithDot = `${keyPrefix}.`;
  if (trimmed.startsWith(prefixWithDot)) {
    const tail = trimmed.slice(prefixWithDot.length).replace(/\.+$/, "");
    if (!tail) {
      return null;
    }
    return `${keyPrefix}.${tail}`;
  }
  if (!trimmed.includes(".")) {
    return `${keyPrefix}.${trimmed}`;
  }
  if (!underParent) {
    return trimmed;
  }
  return null;
}

/** Сообщение для поля «Ключ», если путь не продолжает выбранного родителя. */
export function getCreateTagKeyValidationError(
  input: string,
  parent: Pick<TaxonomyTag, "key" | "label"> | undefined,
  scopeKey: string,
  createParentId: string | null,
): string | null {
  if (!createParentId || !parent) {
    const keyPrefix = taxonomyCreateKeyPrefix(undefined, scopeKey);
    const fullKey = resolveCreateTagFullKey(input, keyPrefix, false);
    return fullKey
      ? null
      : `Укажите сегмент ключа после «${scopeKeyDotPrefix(scopeKey)}»`;
  }
  const keyPrefix = parent.key;
  const trimmed = input.trim();
  const expectedPrefix = `${keyPrefix}.`;
  const fullKey = resolveCreateTagFullKey(input, keyPrefix, true);
  if (fullKey) {
    return null;
  }
  if (trimmed.includes(".") && !trimmed.startsWith(expectedPrefix)) {
    return (
      `Ключ введён неверно: для «${parent.label}» (${parent.key}) ` +
      `нужно начинать с «${expectedPrefix}», а не с «${trimmed}».`
    );
  }
  return `Укажите сегмент ключа после «${expectedPrefix}»`;
}

/** API parentId — выбранный в UI родитель (без подъёма к корню CROP). */
export function resolveCreateTagApiParentId(
  uiParent: TagParentRef | undefined,
): string | null {
  return uiParent?.id ?? null;
}

export function formatCreateTaxonomyTagError(
  error: unknown,
  uiParent?: Pick<TaxonomyTag, "key" | "label">,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Ошибка сохранения";
  if (raw.includes("CROP_VARIANT parent must be") && uiParent) {
    return (
      `Нельзя создать подтег с таким родителем. ` +
      `Проверьте ключ: он должен начинаться с «${uiParent.key}.».`
    );
  }
  if (raw.includes("TaxonomyTag key already exists")) {
    return "Тег с таким ключом уже существует";
  }
  return raw;
}

export function groupParentOptions(
  flatTags: TaxonomyTag[],
  scopeKey: string,
): Array<{ value: string; label: string }> {
  if (scopeKey === "crop") {
    return flatTags
      .filter((tag) => tag.namespace === "CROP")
      .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
  }
  if (isGuidesScope(scopeKey)) {
    return flatTags
      .filter((tag) => tag.namespace === "TOPIC" && !tag.parentId)
      .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
  }
  return flatTags
    .filter((tag) => (tag.childIds?.length ?? tag.children?.length ?? 0) > 0)
    .map((tag) => ({ value: tag.id, label: `${tag.label} (${tag.key})` }));
}
