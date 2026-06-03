<script setup lang="ts">
import { Typography, Alert, Empty } from "ant-design-vue";
</script>

<template>
  <div>
    <Typography.Title :level="4">Сущности (Entity Definition)</Typography.Title>
    <Alert
      type="info"
      show-icon
      message="Скелет UI"
      description="Создание slug, displayName, иерархии и привязки к projection stream — в задаче ADMIN-VUE-2 после контракта Nest."
      style="margin-bottom: 24px"
    />
    <Empty description="Список сущностей появится после API" />
  </div>
</template>
