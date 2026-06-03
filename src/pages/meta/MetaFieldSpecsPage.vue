<script setup lang="ts">
import { Typography, Alert, Empty } from "ant-design-vue";
</script>

<template>
  <div>
    <Typography.Title :level="4">Field Spec</Typography.Title>
    <Alert
      type="info"
      show-icon
      message="Скелет UI"
      description="Перенос логики из React Field Specs / Field Patterns — Phase 2–3. Unit policy — см. field-spec-unit-handoff."
      style="margin-bottom: 24px"
    />
    <Empty description="Редактор полей — в разработке" />
  </div>
</template>
