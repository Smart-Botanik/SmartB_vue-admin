<script setup lang="ts">
import { Typography, Alert } from "ant-design-vue";

defineProps<{
  title: string;
  phase: string;
}>();
</script>

<template>
  <div>
    <Typography.Title :level="4">{{ title }}</Typography.Title>
    <Alert
      type="warning"
      show-icon
      :message="`${phase}: перенос из React Admin`"
      :description="`Страница ${title} будет реализована в Vue после Meta Platform и контрактов API.`"
    />
  </div>
</template>
