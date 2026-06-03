<script setup lang="ts">
import { Typography, Alert, Empty } from "ant-design-vue";
</script>

<template>
  <div>
    <Typography.Title :level="4">Шаблоны событий</Typography.Title>
    <Alert
      type="info"
      show-icon
      message="Скелет UI"
      description="Шаблон собирается из Profile Spec (как diary.setup / plant event presets, но без жёсткой привязки к сущности)."
      style="margin-bottom: 24px"
    />
    <Empty description="Конструктор шаблонов — в разработке" />
  </div>
</template>
