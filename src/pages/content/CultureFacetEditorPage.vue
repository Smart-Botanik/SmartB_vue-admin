<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { SearchOutlined } from "@ant-design/icons-vue";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "ant-design-vue";
import {
  CONTENT_FACET_TEXT_ROLES,
  TAXONOMY_CROPS_LIST_PATH,
  TAXONOMY_SCOPE_CROP,
} from "@growing/contracts";

import {
  contentFacetApi,
  type ContentFacetProfile,
  type ContentFacetSubjectInput,
} from "@/api/content/contentFacetApi";
import { mediaApi, type MediaUploadResponse } from "@/api/media/mediaApi";
import { taxonomyApi } from "@/api/taxonomy/taxonomyApi";
import AiCultureFacetPanel, {
  type CultureFacetAiTexts,
} from "@/components/content/AiCultureFacetPanel.vue";
import IconSearchModal from "@/components/content/IconSearchModal.vue";
import type { TaxonomyTag } from "@/types/content";

const { Title, Text } = Typography;

type CropOption = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
};

type FormModel = {
  chipIcon: string;
  hubTitle: string;
  hubLead: string;
  aboutShort: string;
  seoDescription: string;
};

const crops = ref<CropOption[]>([]);
const chipIconByKey = ref<Record<string, string>>({});
const selectedKey = ref<string | undefined>(undefined);
const profile = ref<ContentFacetProfile | null>(null);
const loading = ref(true);
const loadingProfile = ref(false);
const submitting = ref(false);
const logoUploading = ref(false);
const imageMUploading = ref(false);
const previewUploading = ref(false);
const logo = ref<MediaUploadResponse | null>(null);
const imageM = ref<MediaUploadResponse | null>(null);
const preview = ref<MediaUploadResponse | null>(null);
const logoInput = ref<HTMLInputElement | null>(null);
const imageMInput = ref<HTMLInputElement | null>(null);
const previewInput = ref<HTMLInputElement | null>(null);
const iconSearchOpen = ref(false);

const formModel = reactive<FormModel>({
  chipIcon: "",
  hubTitle: "",
  hubLead: "",
  aboutShort: "",
  seoDescription: "",
});

const selectedCrop = computed(() =>
  crops.value.find(crop => crop.key === selectedKey.value) ?? null,
);

const subject = computed<ContentFacetSubjectInput | null>(() => {
  if (!selectedCrop.value) {
    return null;
  }
  return {
    type: "TAXONOMY_TAG",
    id: selectedCrop.value.id,
    key: selectedCrop.value.key,
  };
});

const cropSelectOptions = computed(() =>
  crops.value.map(crop => {
    const emoji = chipIconByKey.value[crop.key]?.trim();
    const prefix = emoji ? `${emoji} ` : "";
    return {
      value: crop.key,
      label: `${prefix}${crop.label} (${crop.key})`,
    };
  }),
);

const logoMediaFolder = computed(() => {
  if (!selectedKey.value) {
    return "";
  }
  return `facets/culture/${selectedKey.value.replace(/^crop\./, "")}`;
});

function openIconSearch() {
  if (!selectedKey.value) {
    message.error("Сначала выберите культуру");
    return;
  }
  iconSearchOpen.value = true;
}

function onIconApplied(media: MediaUploadResponse) {
  logo.value = media;
}

function onAiTextsApply(texts: CultureFacetAiTexts) {
  formModel.hubLead = texts.hubLead;
  formModel.aboutShort = texts.aboutShort;
  formModel.seoDescription = texts.seoDescription;
  if (texts.hubTitle && !formModel.hubTitle.trim()) {
    formModel.hubTitle = texts.hubTitle;
  }
}

function clearLogo() {
  if (!logo.value) {
    return;
  }
  const mediaId = logo.value.id;
  Modal.confirm({
    title: "Удалить LOGO?",
    content:
      "LOGO будет снят с формы. Сохраните профиль, чтобы убрать слот из content-edges. Файл в Media удалится по возможности.",
    okText: "Удалить",
    okType: "danger",
    cancelText: "Отмена",
    onOk: async () => {
      logo.value = null;
      if (mediaId) {
        try {
          await mediaApi.deleteMedia(mediaId);
        } catch (error) {
          message.warning(
            error instanceof Error
              ? `LOGO снят с формы, но Media не удалился: ${error.message}`
              : "LOGO снят с формы, но Media не удалился",
          );
          message.info("Сохраните профиль, чтобы убрать LOGO из content-edges");
          return;
        }
      }
      message.success("LOGO удалён — сохраните профиль");
    },
  });
}

function collectCropRoots(forest: TaxonomyTag[]): CropOption[] {
  const roots: CropOption[] = [];

  function walk(nodes: TaxonomyTag[]) {
    for (const node of nodes) {
      const isRoot =
        !node.parentId &&
        node.namespace === TAXONOMY_CROPS_LIST_PATH.namespace;
      if (isRoot) {
        roots.push({
          id: node.id,
          key: node.key,
          label: node.label,
          sortOrder: node.sortOrder,
        });
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }

  walk(forest);
  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

function mediaFromSlot(
  slot: ContentFacetProfile["slots"][number] | undefined,
  name: string,
): MediaUploadResponse | null {
  if (!slot?.media) {
    return null;
  }
  return {
    id: slot.media.id,
    name,
    url: slot.media.url,
    size: 0,
    mimeType: "image/*",
    width: slot.media.width ?? undefined,
    height: slot.media.height ?? undefined,
    createdAt: "",
  };
}

function textSlotValue(
  item: ContentFacetProfile | null,
  role: string,
): string {
  return (
    item?.slots.find(slot => slot.kind === "TEXT" && slot.role === role)
      ?.textValue ?? ""
  );
}

function applyProfileToForm(item: ContentFacetProfile | null) {
  profile.value = item;
  formModel.chipIcon = textSlotValue(
    item,
    CONTENT_FACET_TEXT_ROLES.CHIP_ICON,
  ).trim();
  formModel.hubTitle = textSlotValue(item, CONTENT_FACET_TEXT_ROLES.HUB_TITLE);
  formModel.hubLead = textSlotValue(item, CONTENT_FACET_TEXT_ROLES.HUB_LEAD);
  formModel.aboutShort = textSlotValue(
    item,
    CONTENT_FACET_TEXT_ROLES.ABOUT_SHORT,
  );
  formModel.seoDescription = textSlotValue(
    item,
    CONTENT_FACET_TEXT_ROLES.SEO_DESCRIPTION,
  );

  logo.value = mediaFromSlot(
    item?.slots.find(slot => slot.kind === "LOGO"),
    "LOGO",
  );
  imageM.value = mediaFromSlot(
    item?.slots.find(slot => slot.kind === "IMAGE_M"),
    "IMAGE_M",
  );
  preview.value = mediaFromSlot(
    item?.slots.find(slot => slot.kind === "PREVIEW"),
    "PREVIEW",
  );

  if (selectedKey.value) {
    const next = { ...chipIconByKey.value };
    if (formModel.chipIcon) {
      next[selectedKey.value] = formModel.chipIcon;
    } else {
      delete next[selectedKey.value];
    }
    chipIconByKey.value = next;
  }
}

async function loadChipIconsFromProfiles(options: CropOption[]) {
  const entries = await Promise.all(
    options.map(async crop => {
      try {
        const item = await contentFacetApi.getProfile({
          type: "TAXONOMY_TAG",
          id: crop.id,
          key: crop.key,
        });
        const chip =
          item?.slots.find(
            slot =>
              slot.kind === "TEXT" &&
              slot.role === CONTENT_FACET_TEXT_ROLES.CHIP_ICON,
          )?.textValue?.trim() ?? "";
        return [crop.key, chip] as const;
      } catch {
        return [crop.key, ""] as const;
      }
    }),
  );

  const map: Record<string, string> = {};
  for (const [key, chip] of entries) {
    if (chip) {
      map[key] = chip;
    }
  }
  chipIconByKey.value = map;
}

async function loadCrops() {
  loading.value = true;
  try {
    const forest = await taxonomyApi.fetchForest(TAXONOMY_SCOPE_CROP);
    crops.value = collectCropRoots(forest);
    await loadChipIconsFromProfiles(crops.value);
    if (!selectedKey.value && crops.value[0]) {
      selectedKey.value = crops.value[0].key;
    }
  } catch (error) {
    message.error(
      error instanceof Error ? error.message : "Не удалось загрузить культуры",
    );
  } finally {
    loading.value = false;
  }
}

async function loadProfile() {
  if (!subject.value || !selectedKey.value) {
    applyProfileToForm(null);
    return;
  }

  loadingProfile.value = true;
  try {
    const item = await contentFacetApi.getProfile(subject.value);
    applyProfileToForm(item);
  } catch (error) {
    applyProfileToForm(null);
    message.error(
      error instanceof Error ? error.message : "Не удалось загрузить профиль",
    );
  } finally {
    loadingProfile.value = false;
  }
}

function buildSlots() {
  const slots: Array<{
    kind: "TEXT" | "LOGO" | "IMAGE_M" | "PREVIEW";
    role?: string;
    textValue?: string;
    mediaId?: string;
    sortOrder: number;
  }> = [];

  const chipIcon = formModel.chipIcon.trim();
  if (chipIcon) {
    slots.push({
      kind: "TEXT",
      role: CONTENT_FACET_TEXT_ROLES.CHIP_ICON,
      textValue: chipIcon,
      sortOrder: 0,
    });
  }

  const hubTitle = formModel.hubTitle.trim();
  if (hubTitle) {
    slots.push({
      kind: "TEXT",
      role: CONTENT_FACET_TEXT_ROLES.HUB_TITLE,
      textValue: hubTitle,
      sortOrder: 1,
    });
  }

  const hubLead = formModel.hubLead.trim();
  if (hubLead) {
    slots.push({
      kind: "TEXT",
      role: CONTENT_FACET_TEXT_ROLES.HUB_LEAD,
      textValue: hubLead,
      sortOrder: 2,
    });
  }

  const aboutShort = formModel.aboutShort.trim();
  if (aboutShort) {
    slots.push({
      kind: "TEXT",
      role: CONTENT_FACET_TEXT_ROLES.ABOUT_SHORT,
      textValue: aboutShort,
      sortOrder: 3,
    });
  }

  const seoDescription = formModel.seoDescription.trim();
  if (seoDescription) {
    slots.push({
      kind: "TEXT",
      role: CONTENT_FACET_TEXT_ROLES.SEO_DESCRIPTION,
      textValue: seoDescription,
      sortOrder: 4,
    });
  }

  if (logo.value?.id) {
    slots.push({
      kind: "LOGO",
      mediaId: logo.value.id,
      sortOrder: 5,
    });
  }
  if (imageM.value?.id) {
    slots.push({
      kind: "IMAGE_M",
      mediaId: imageM.value.id,
      sortOrder: 6,
    });
  }
  if (preview.value?.id) {
    slots.push({
      kind: "PREVIEW",
      mediaId: preview.value.id,
      sortOrder: 7,
    });
  }

  return slots;
}

async function onSubmit() {
  if (!subject.value) {
    message.error("Выберите культуру");
    return;
  }

  submitting.value = true;
  try {
    const saved = await contentFacetApi.upsertProfile({
      subject: subject.value,
      profileKind: "culture_tag",
      slots: buildSlots(),
    });
    applyProfileToForm(saved);
    message.success("Профиль сохранён");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка сохранения");
  } finally {
    submitting.value = false;
  }
}

async function handlePublishToggle() {
  if (!subject.value) {
    return;
  }

  try {
    if (profile.value?.status === "PUBLISHED") {
      const saved = await contentFacetApi.unpublishProfile(subject.value);
      applyProfileToForm(saved);
      message.success("Снято с публикации");
      return;
    }

    await contentFacetApi.upsertProfile({
      subject: subject.value,
      profileKind: "culture_tag",
      slots: buildSlots(),
    });
    const saved = await contentFacetApi.publishProfile(subject.value);
    applyProfileToForm(saved);
    message.success("Опубликовано");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка публикации");
  }
}

async function uploadSlot(
  files: FileList | null,
  target: "logo" | "imageM" | "preview",
) {
  const file = files?.[0];
  if (!file || !selectedKey.value) {
    return;
  }

  const folder = `facets/culture/${selectedKey.value.replace(/^crop\./, "")}`;
  if (target === "logo") {
    logoUploading.value = true;
  } else if (target === "imageM") {
    imageMUploading.value = true;
  } else {
    previewUploading.value = true;
  }

  try {
    const uploaded = await mediaApi.uploadFiles([file], folder);
    const media = uploaded[0] ?? null;
    if (target === "logo") {
      logo.value = media;
    } else if (target === "imageM") {
      imageM.value = media;
    } else {
      preview.value = media;
    }
    message.success("Медиа загружено");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "Ошибка загрузки");
  } finally {
    if (target === "logo") {
      logoUploading.value = false;
    } else if (target === "imageM") {
      imageMUploading.value = false;
    } else {
      previewUploading.value = false;
    }
  }
}

watch(selectedKey, () => {
  void loadProfile();
});

onMounted(() => {
  void loadCrops().then(() => {
    if (selectedKey.value) {
      void loadProfile();
    }
  });
});
</script>

<template>
  <Space direction="vertical" size="large" style="width: 100%">
    <Space align="center" style="width: 100%; justify-content: space-between">
      <Title :level="3" style="margin: 0">Фасеты культур</Title>
      <Space>
        <Tag
          v-if="profile"
          :color="profile.status === 'PUBLISHED' ? 'green' : 'default'"
        >
          {{ profile.status }}
        </Tag>
        <Tag v-else color="default">нет профиля</Tag>
        <Button :disabled="!subject" @click="handlePublishToggle">
          {{
            profile?.status === "PUBLISHED"
              ? "Снять с публикации"
              : "Опубликовать"
          }}
        </Button>
      </Space>
    </Space>

    <Text type="secondary">
      profileKind: culture_tag · слоты chip_icon, hub_title, hub_lead, about_short,
      seo_description, LOGO, IMAGE_M, PREVIEW · BFF → content-edges
    </Text>

    <Card :loading="loading">
      <Form layout="vertical" :model="formModel" @finish="onSubmit">
        <Form.Item label="Культура" required>
          <Select
            v-model:value="selectedKey"
            style="width: 100%; max-width: 420px"
            :options="cropSelectOptions"
            placeholder="Выберите культуру"
          />
        </Form.Item>

        <div class="culture-editor-texts">
          <Card
            size="small"
            title="Тексты"
            :loading="loadingProfile"
            class="culture-editor-texts__form"
          >
            <Form.Item label="Chip icon (emoji)" name="chipIcon">
              <Input
                v-model:value="formModel.chipIcon"
                :maxlength="16"
                placeholder="🍅 (необязательно)"
                allow-clear
              />
            </Form.Item>
            <Form.Item label="Hub title" name="hubTitle">
              <Input
                v-model:value="formModel.hubTitle"
                :maxlength="120"
                placeholder="Заголовок hub (например: Томаты)"
                allow-clear
              />
            </Form.Item>
            <Form.Item label="Hub lead" name="hubLead">
              <Input.TextArea
                v-model:value="formModel.hubLead"
                :rows="3"
                :maxlength="500"
                placeholder="Короткий лид для hub культуры"
              />
            </Form.Item>
            <Form.Item label="About short" name="aboutShort">
              <Input.TextArea
                v-model:value="formModel.aboutShort"
                :rows="4"
                :maxlength="1200"
                placeholder="Краткое описание культуры на hub"
              />
            </Form.Item>
            <Form.Item label="SEO description" name="seoDescription">
              <Input.TextArea
                v-model:value="formModel.seoDescription"
                :rows="2"
                :maxlength="320"
                placeholder="Meta description для страницы культуры"
              />
            </Form.Item>
          </Card>

          <AiCultureFacetPanel
            class="culture-editor-texts__ai"
            :subject-key="selectedKey"
            :display-name="selectedCrop?.label"
            :current="{
              hubTitle: formModel.hubTitle,
              hubLead: formModel.hubLead,
              aboutShort: formModel.aboutShort,
              seoDescription: formModel.seoDescription,
            }"
            @apply="onAiTextsApply"
          />
        </div>

        <Card size="small" title="Медиа" :loading="loadingProfile" style="margin-bottom: 16px">
          <Form.Item label="LOGO (PNG chip icon)">
            <input
              ref="logoInput"
              type="file"
              accept="image/png,image/*"
              hidden
              @change="uploadSlot(($event.target as HTMLInputElement).files, 'logo')"
            />
            <Space wrap>
              <Button :loading="logoUploading" @click="logoInput?.click()">
                Загрузить LOGO
              </Button>
              <Button :disabled="!selectedKey" @click="openIconSearch">
                <template #icon><SearchOutlined /></template>
                Найти иконку
              </Button>
              <Button
                danger
                :disabled="!logo"
                @click="clearLogo"
              >
                Удалить LOGO
              </Button>
            </Space>
            <div v-if="logo?.url" style="margin-top: 8px">
              <img
                :src="logo.url"
                alt="LOGO"
                style="max-width: 64px; max-height: 64px; display: block"
              />
              <Text type="secondary">mediaId: {{ logo.id }}</Text>
            </div>
          </Form.Item>

          <Form.Item label="IMAGE_M (sidebar / hub)">
            <input
              ref="imageMInput"
              type="file"
              accept="image/*"
              hidden
              @change="uploadSlot(($event.target as HTMLInputElement).files, 'imageM')"
            />
            <Button :loading="imageMUploading" @click="imageMInput?.click()">
              Загрузить IMAGE_M
            </Button>
            <div v-if="imageM?.url" style="margin-top: 8px">
              <img
                :src="imageM.url"
                alt="IMAGE_M"
                style="max-width: 240px; max-height: 140px; display: block"
              />
              <Text type="secondary">mediaId: {{ imageM.id }}</Text>
            </div>
          </Form.Item>

          <Form.Item label="PREVIEW">
            <input
              ref="previewInput"
              type="file"
              accept="image/*"
              hidden
              @change="uploadSlot(($event.target as HTMLInputElement).files, 'preview')"
            />
            <Button :loading="previewUploading" @click="previewInput?.click()">
              Загрузить PREVIEW
            </Button>
            <div v-if="preview?.url" style="margin-top: 8px">
              <img
                :src="preview.url"
                alt="PREVIEW"
                style="max-width: 160px; max-height: 160px; display: block"
              />
              <Text type="secondary">mediaId: {{ preview.id }}</Text>
            </div>
          </Form.Item>
        </Card>

        <Button type="primary" html-type="submit" :loading="submitting" :disabled="!subject">
          Сохранить
        </Button>
      </Form>
    </Card>

    <IconSearchModal
      v-model:open="iconSearchOpen"
      :media-folder="logoMediaFolder"
      :has-existing-logo="Boolean(logo?.id)"
      :culture-label="selectedCrop?.label"
      @applied="onIconApplied"
    />
  </Space>
</template>

<style scoped>
.culture-editor-texts {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 16px;
  margin-bottom: 16px;
  align-items: start;
}

.culture-editor-texts__form,
.culture-editor-texts__ai {
  min-width: 0;
}

@media (max-width: 960px) {
  .culture-editor-texts {
    grid-template-columns: 1fr;
  }
}
</style>
