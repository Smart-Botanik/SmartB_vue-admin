<script setup lang="ts">
import { computed, h, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Layout as ALayout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Button,
  Typography,
  Tag,
} from "ant-design-vue";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  LinkOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  TagsOutlined,
  FileTextOutlined,
  SendOutlined,
} from "@ant-design/icons-vue";
import {
  VUE_TO_REACT_MENU,
  crossAppLinkHref,
} from "@growing/admin-shell";
import { VUE_MENU_SECTIONS } from "@/config/vueMenu";
import { useAuthStore } from "@/stores/auth";
import { envConfig } from "@/config/env";
import "./AdminLayout.css";

const { Header, Sider, Content } = ALayout;
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const collapsed = ref(true);

const selectedKeys = computed(() => {
  if (route.path.startsWith("/content/guides")) {
    return ["/content/guides"];
  }
  return [route.path];
});

const openKeys = ref<string[]>([
  "section-content",
  "section-community",
  "section-meta",
  "section-roadmap",
  "section-react",
]);

function sectionIcon(key: string) {
  if (key === "content") {
    return h(FileTextOutlined);
  }
  if (key === "community") {
    return h(SendOutlined);
  }
  if (key === "taxonomy") {
    return h(TagsOutlined);
  }
  if (key === "meta") {
    return h(DeploymentUnitOutlined);
  }
  return h(AppstoreOutlined);
}

function internalHref(path: string) {
  return router.resolve(path).href;
}

function onInternalLinkClick(event: MouseEvent, path: string) {
  // Let the browser handle new-tab intents natively:
  // middle click (button 1), Ctrl/Cmd/Shift/Alt click.
  if (
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (path !== route.path) {
    router.push(path);
  }
}

const menuItems = computed(() => {
  const internalSections = VUE_MENU_SECTIONS.map((section) => ({
    key: `section-${section.key}`,
    icon: () => sectionIcon(section.key),
    label: section.title,
    children: section.items.map((item) => ({
      key: item.path,
      label: h(
        "a",
        {
          href: internalHref(item.path),
          class: "admin-vue-menu-link",
          onClick: (event: MouseEvent) => onInternalLinkClick(event, item.path),
          onAuxclick: (event: MouseEvent) => {
            // Prevent Ant Menu from selecting on middle click; browser opens the tab.
            event.stopPropagation();
          },
        },
        item.label,
      ),
    })),
  }));

  const reactSection = {
    key: "section-react",
    icon: () => h(LinkOutlined),
    label: VUE_TO_REACT_MENU.title,
    children: VUE_TO_REACT_MENU.links.map((link) => ({
      key: `ext-${link.key}`,
      label: h(
        "a",
        {
          href: crossAppLinkHref(link),
          class: "admin-vue-menu-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        link.label,
      ),
    })),
  };

  return [
    {
      key: "/",
      label: h(
        "a",
        {
          href: internalHref("/"),
          class: "admin-vue-menu-link",
          onClick: (event: MouseEvent) => onInternalLinkClick(event, "/"),
          onAuxclick: (event: MouseEvent) => {
            event.stopPropagation();
          },
        },
        "Dashboard",
      ),
    },
    ...internalSections,
    reactSection,
  ];
});

function onMenuClick(info: { key: string | number }) {
  const key = String(info.key);
  if (key.startsWith("ext-") || !key.startsWith("/")) {
    return;
  }
  router.push(key);
}

async function onLogout() {
  await auth.logout();
  router.push("/login");
}

const displayName = computed(() => {
  const u = auth.user;
  if (!u) {
    return "Admin";
  }
  if (u.firstName && u.lastName) {
    return `${u.firstName} ${u.lastName}`;
  }
  return u.email;
});
</script>

<template>
  <ALayout class="admin-vue-layout">
    <Sider
      v-model:collapsed="collapsed"
      collapsible
      :trigger="null"
      theme="dark"
      :width="260"
      :collapsed-width="72"
      breakpoint="lg"
    >
      <div class="admin-vue-logo">
        <span v-if="!collapsed">SmartБотаник</span>
        <span v-else>SB</span>
        <Tag v-if="!collapsed" color="processing" class="admin-vue-beta-tag">Vue</Tag>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        :selected-keys="selectedKeys"
        v-model:open-keys="openKeys"
        :items="menuItems"
        @click="onMenuClick"
      />
    </Sider>
    <ALayout>
      <Header class="admin-vue-header">
        <Space>
          <Button
            type="text"
            :icon="collapsed ? h(MenuUnfoldOutlined) : h(MenuFoldOutlined)"
            @click="collapsed = !collapsed"
          />
          <Typography.Title :level="4" class="admin-vue-header-title">
            {{ envConfig.appName }}
          </Typography.Title>
        </Space>
        <Dropdown>
          <Space class="admin-vue-user-trigger">
            <Avatar :icon="h(UserOutlined)" />
            <span>{{ displayName }}</span>
          </Space>
          <template #overlay>
            <Menu
              :items="[
                {
                  key: 'logout',
                  icon: h(LogoutOutlined),
                  label: 'Выйти',
                  onClick: onLogout,
                },
              ]"
            />
          </template>
        </Dropdown>
      </Header>
      <Content class="admin-vue-content">
        <RouterView />
      </Content>
    </ALayout>
  </ALayout>
</template>
