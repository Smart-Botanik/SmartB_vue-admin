import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/LoginPage.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/components/layout/AdminLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/pages/DashboardPage.vue"),
        },
        {
          path: "entities/taxonomy",
          name: "taxonomy-directory",
          component: () => import("@/pages/taxonomy/TaxonomyDirectoryPage.vue"),
        },
        {
          path: "content/site-pages/home",
          name: "site-home-editor",
          component: () => import("@/pages/content/HomePageEditorPage.vue"),
        },
        {
          path: "content/site-pages/calendar",
          name: "site-calendar-editor",
          component: () => import("@/pages/content/CalendarPageEditorPage.vue"),
        },
        {
          path: "content/calendar-days",
          name: "calendar-days-list",
          component: () => import("@/pages/content/CalendarDaysPage.vue"),
        },
        {
          path: "content/calendar-days/:date",
          name: "calendar-day-editor",
          component: () => import("@/pages/content/CalendarDayEditorPage.vue"),
        },
        {
          path: "content/facets/culture",
          name: "culture-facet-editor",
          component: () => import("@/pages/content/CultureFacetEditorPage.vue"),
        },
        {
          path: "content/useful",
          name: "useful-feed",
          component: () => import("@/pages/content/UsefulFeedPage.vue"),
        },
        {
          path: "content/guides/create",
          name: "guide-create",
          component: () => import("@/pages/content/GuideCreatePage.vue"),
        },
        {
          path: "content/guides/edit/:id",
          name: "guide-edit",
          component: () => import("@/pages/content/GuideEditPage.vue"),
        },
        {
          path: "content/guides",
          name: "guides-list",
          component: () => import("@/pages/content/GuidesPage.vue"),
        },
        {
          path: "community/telegram",
          name: "telegram-hub",
          component: () => import("@/pages/telegram/TelegramHubPage.vue"),
        },
        {
          path: "content/taxonomy",
          redirect: { name: "taxonomy-directory" },
        },
        {
          path: "content/taxonomy-tags",
          redirect: { name: "taxonomy-directory" },
        },
        {
          path: "meta",
          name: "meta-hub",
          component: () => import("@/pages/meta/MetaHubPage.vue"),
        },
        {
          path: "meta/entities",
          name: "meta-entities",
          component: () => import("@/pages/meta/MetaEntitiesPage.vue"),
        },
        {
          path: "meta/field-specs",
          name: "meta-field-specs",
          component: () => import("@/pages/meta/MetaFieldSpecsPage.vue"),
        },
        {
          path: "meta/profile-specs",
          name: "meta-profile-specs",
          component: () => import("@/pages/meta/MetaProfileSpecsPage.vue"),
        },
        {
          path: "meta/event-templates",
          name: "meta-event-templates",
          component: () => import("@/pages/meta/MetaEventTemplatesPage.vue"),
        },
        {
          path: "media",
          name: "media-library",
          component: () => import("@/pages/media/MediaLibraryPage.vue"),
        },
        {
          path: "media/galleries",
          name: "media-galleries",
          component: () => import("@/pages/media/GalleriesPage.vue"),
        },
        {
          path: "media/galleries/create",
          name: "gallery-create",
          component: () => import("@/pages/media/GalleryEditorPage.vue"),
        },
        {
          path: "media/galleries/edit/:id",
          name: "gallery-edit",
          component: () => import("@/pages/media/GalleryEditorPage.vue"),
        },
        {
          path: "roadmap/field-patterns",
          name: "roadmap-field-patterns",
          component: () => import("@/pages/roadmap/RoadmapPlaceholderPage.vue"),
          props: { title: "Field Patterns", phase: "Phase 2" },
        },
        {
          path: "roadmap/registry-tags",
          name: "roadmap-registry-tags",
          component: () => import("@/pages/roadmap/RoadmapPlaceholderPage.vue"),
          props: { title: "Registry Tags", phase: "Phase 2" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.initialize();
  }

  if (to.meta.public) {
    if (auth.isAuthenticated) {
      return { name: "dashboard" };
    }
    return true;
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  return true;
});

export default router;
