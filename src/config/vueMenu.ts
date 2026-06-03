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
      { key: "/roadmap/media", label: "Media", path: "/roadmap/media" },
    ],
  },
];
