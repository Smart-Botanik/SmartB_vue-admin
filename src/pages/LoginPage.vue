<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Alert, Button, Card, Form, Input, Typography } from "ant-design-vue";
import { getAdminReactBaseUrl } from "@growing/admin-shell";
import { useAuthStore } from "@/stores/auth";
import { envConfig } from "@/config/env";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const submitting = ref(false);

const form = reactive({
  identifier: "",
  password: "",
});

async function onSubmit() {
  submitting.value = true;
  auth.clearError();
  try {
    await auth.login({
      identifier: form.identifier.trim(),
      password: form.password,
    });
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.push(redirect);
  } catch {
    // error in store
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <Card class="login-card" :title="envConfig.appName">
      <Typography.Paragraph type="secondary">
        Те же учётные данные, что и в React-админке. При одном origin (prod)
        JWT в <code>localStorage</code> общий; в dev на разных портах — отдельный
        вход или прокси на один host.
      </Typography.Paragraph>

      <Alert
        v-if="auth.error"
        type="error"
        :message="auth.error"
        show-icon
        style="margin-bottom: 16px"
      />

      <Form layout="vertical" :model="form" @finish="onSubmit">
        <Form.Item
          label="Email или логин"
          name="identifier"
          :rules="[{ required: true, message: 'Укажите email или логин' }]"
        >
          <Input
            v-model:value="form.identifier"
            autocomplete="username"
            size="large"
          />
        </Form.Item>
        <Form.Item
          label="Пароль"
          name="password"
          :rules="[{ required: true, message: 'Укажите пароль' }]"
        >
          <Input.Password
            v-model:value="form.password"
            autocomplete="current-password"
            size="large"
          />
        </Form.Item>
        <Button
          type="primary"
          html-type="submit"
          block
          size="large"
          :loading="submitting"
        >
          Войти
        </Button>
      </Form>

      <Typography.Paragraph style="margin-top: 16px">
        <a :href="getAdminReactBaseUrl()" target="_blank" rel="noopener noreferrer">
          Открыть React Admin
        </a>
      </Typography.Paragraph>
    </Card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f0f2f5;
}

.login-card {
  width: 100%;
  max-width: 420px;
}
</style>
