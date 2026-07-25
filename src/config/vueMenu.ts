export type VueMenuItem = {
  key: string;
  label: string;
  path: string;
};

export type VueMenuSection = {
  key: string;
  title: string;
  items: VueMenuItem[];
};

/** In-app routes for the Vue admin (meta platform + future migrations). */
export const VUE_MENU_SECTIONS: VueMenuSection[] = [
  {
    key: "content",
    title: "Контент",
    items: [
      {
        key: "/content/guides",
        label: "Руководства",
        path: "/content/guides",
      },
      {
        key: "/content/site-pages/home",
        label: "Главная страница",
        path: "/content/site-pages/home",
      },
      {
        key: "/content/site-pages/calendar",
        label: "Календарь",
        path: "/content/site-pages/calendar",
      },
      {
        key: "/content/calendar-days",
        label: "Дни календаря",
        path: "/content/calendar-days",
      },
      {
        key: "/content/facets/culture",
        label: "Фасеты культур",
        path: "/content/facets/culture",
      },
      {
        key: "/content/useful",
        label: "Полезное (лента)",
        path: "/content/useful",
      },
    ],
  },
  {
    key: "community",
    title: "Сообщество",
    items: [
      {
        key: "/community/telegram",
        label: "Telegram",
        path: "/community/telegram",
      },
    ],
  },
  {
    key: "taxonomy",
    title: "Таксономия",
    items: [
      {
        key: "/entities/taxonomy",
        label: "Справочник таксономии",
        path: "/entities/taxonomy",
      },
    ],
  },
  {
    key: "meta",
    title: "Meta Platform",
    items: [
      { key: "/meta", label: "Обзор", path: "/meta" },
      { key: "/meta/entities", label: "Сущности", path: "/meta/entities" },
      { key: "/meta/field-specs", label: "Field Spec", path: "/meta/field-specs" },
      {
        key: "/meta/profile-specs",
        label: "Profile Spec",
        path: "/meta/profile-specs",
      },
      {
        key: "/meta/event-templates",
        label: "Шаблоны событий",
        path: "/meta/event-templates",
      },
    ],
  },
  {
    key: "media",
    title: "Media",
    items: [
      { key: "/media", label: "Файлы", path: "/media" },
      { key: "/media/galleries", label: "Галереи", path: "/media/galleries" },
    ],
  },
  {
    key: "roadmap",
    title: "Перенос (roadmap)",
    items: [
      {
        key: "/roadmap/field-patterns",
        label: "Field Patterns",
        path: "/roadmap/field-patterns",
      },
      {
        key: "/roadmap/registry-tags",
        label: "Registry Tags",
        path: "/roadmap/registry-tags",
      },
    ],
  },
];
