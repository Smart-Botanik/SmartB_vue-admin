export type TaxonomyTagNamespace = "CROP" | "CROP_VARIANT" | "TOPIC" | "PRODUCT_USE";

export type CropKind = "TOMATO" | "ZUCCHINI" | "EGGPLANT" | "CUCUMBER";

export type TaxonomyTagStatus = "ACTIVE" | "DEPRECATED";

export type TaxonomyScope = {
  key: string;
  label: string;
  description?: string | null;
  sortOrder: number;
};

export type TaxonomyGroupDeleteStrategy = "REASSIGN" | "CASCADE" | "PROMOTE_TO_ROOT";

export type TaxonomyTag = {
  id: string;
  scopeKey: string;
  key: string;
  namespace: TaxonomyTagNamespace;
  label: string;
  sortOrder: number;
  parentId?: string | null;
  cropKind?: string | null;
  variantAxis?: string | null;
  status?: TaxonomyTagStatus;
  parent?: Pick<TaxonomyTag, "id" | "key" | "label"> | null;
  children?: TaxonomyTag[];
  childIds?: string[];
};

export const CROP_KIND_OPTIONS: Array<{ value: CropKind; label: string }> = [
  { value: "TOMATO", label: "Помидоры" },
  { value: "ZUCCHINI", label: "Кабачки" },
  { value: "EGGPLANT", label: "Баклажаны" },
  { value: "CUCUMBER", label: "Огурцы" },
];

export const TAXONOMY_TAG_NAMESPACE_OPTIONS: Array<{
  value: TaxonomyTagNamespace;
  label: string;
}> = [
  { value: "CROP", label: "Культура (crop)" },
  { value: "CROP_VARIANT", label: "Подвид / тип (под crop)" },
  { value: "TOPIC", label: "Тема" },
  { value: "PRODUCT_USE", label: "Применение продукта" },
];

export function taxonomyTagNamespaceLabel(namespace: TaxonomyTagNamespace): string {
  return (
    TAXONOMY_TAG_NAMESPACE_OPTIONS.find((option) => option.value === namespace)
      ?.label ?? namespace
  );
}

export const DELETE_STRATEGY_LABELS: Record<TaxonomyGroupDeleteStrategy, string> = {
  REASSIGN: "Перенести подтеги в другую группу",
  CASCADE: "Удалить группу и все подтеги",
  PROMOTE_TO_ROOT: "Вывести подтеги на корневой уровень раздела",
};
