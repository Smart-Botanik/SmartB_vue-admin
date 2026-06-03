<script setup lang="ts">
import { Typography, Alert, Empty } from "ant-design-vue";
</script>

<template>
  <div>
    <Typography.Title :level="4">Profile Spec</Typography.Title>
    <Alert
      type="info"
      show-icon
      message="Скелет UI"
      description="Аналог Profile Builder v1: набор полей registry profile под action path. Связь с Profile Spec и event template — ADMIN-VUE-2."
      style="margin-bottom: 24px"
    />
    <Empty description="Конструктор профилей — в разработке" />
  </div>
</template>
