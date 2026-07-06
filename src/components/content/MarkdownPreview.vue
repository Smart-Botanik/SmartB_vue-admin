<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { computed } from "vue";
import { resolveMediaRefs } from "@growing/content-markdown";

const props = withDefaults(
  defineProps<{
    markdown: string;
    mediaUrlById?: Record<string, string>;
  }>(),
  {
    mediaUrlById: () => ({}),
  },
);

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

const html = computed(() => {
  const resolved = resolveMediaRefs(props.markdown, props.mediaUrlById);
  return md.render(resolved || "*Пусто*");
});
</script>

<template>
  <div class="guide-md-preview" v-html="html" />
</template>

<style scoped>
.guide-md-preview {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-height: 200px;
  background: #fafafa;
  line-height: 1.6;
}
</style>
