<script setup lang="ts">
import { Typography, Card, Row, Col } from "ant-design-vue";
import { useRouter } from "vue-router";

const router = useRouter();

const tiles = [
  {
    title: "Сущности",
    description: "Определение типов сущностей «на лету» (замена фиксированных Plant, Diary, Location).",
    path: "/meta/entities",
  },
  {
    title: "Field Spec",
    description: "Поля сущности: тип, единицы, привязка к Field Pattern.",
    path: "/meta/field-specs",
  },
  {
    title: "Profile Spec",
    description: "Наборы полей под сценарий (Action Path Registry profile).",
    path: "/meta/profile-specs",
  },
  {
    title: "Шаблоны событий",
    description: "Event template из одного или нескольких Profile Spec.",
    path: "/meta/event-templates",
  },
];
</script>

<template>
  <div>
    <Typography.Title :level="3">Meta Platform</Typography.Title>
    <Typography.Paragraph type="secondary">
      Абстрактный слой поверх фиксированных доменных сущностей. Контракт с бэкендом —
      следующий этап (ADMIN-VUE-2).
    </Typography.Paragraph>
    <Row :gutter="[16, 16]">
      <Col v-for="tile in tiles" :key="tile.path" :xs="24" :md="12">
        <Card
          hoverable
          :title="tile.title"
          @click="router.push(tile.path)"
        >
          {{ tile.description }}
        </Card>
      </Col>
    </Row>
  </div>
</template>
