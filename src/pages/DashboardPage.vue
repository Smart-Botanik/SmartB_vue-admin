<script setup lang="ts">
import { Typography, Card, List, Tag } from "ant-design-vue";
import { REACT_TO_VUE_MENU, crossAppLinkHref } from "@growing/admin-shell";
</script>

<template>
  <div>
    <Typography.Title :level="3">Vue Admin — параллельная ветка</Typography.Title>
    <Typography.Paragraph>
      Здесь развивается <strong>Meta Platform</strong>: динамические сущности, Field
      Spec, Profile Spec и шаблоны событий без жёсткой привязки к Plant / Diary /
      Location.
    </Typography.Paragraph>

    <Card title="Ближайшие шаги" style="margin-top: 16px">
      <List>
        <List.Item>Phase 1 — общее меню React ↔ Vue, авторизация, каркас страниц</List.Item>
        <List.Item>Phase 2 — CRUD meta-сущностей + контракт с Nest</List.Item>
        <List.Item>Phase 3 — перенос Field Patterns, Registry Tags, Media</List.Item>
        <List.Item>Phase 4 — полный cutover с React</List.Item>
      </List>
    </Card>

    <Card title="Разделы Vue" style="margin-top: 16px">
      <List>
        <List.Item v-for="link in REACT_TO_VUE_MENU.links" :key="link.key">
          <a :href="crossAppLinkHref(link)" target="_blank" rel="noopener noreferrer">
            {{ link.label }}
          </a>
          <Tag color="blue">vue</Tag>
        </List.Item>
      </List>
    </Card>
  </div>
</template>
