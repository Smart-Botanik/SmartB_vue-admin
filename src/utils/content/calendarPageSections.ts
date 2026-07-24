export type CalendarModeId = "moon" | "seasons";

export type CalendarIntroFormValues = {
  title: string;
  subtitle: string;
  defaultMode: CalendarModeId;
};

export type CalendarModeFormValues = {
  label: string;
  descriptionMd: string;
  dataJson: string;
};

export const DEFAULT_CALENDAR_INTRO: CalendarIntroFormValues = {
  title: "Календарь",
  subtitle:
    "Лунный и сезонный календари для работ в саду. Выберите режим — подсказки и данные ниже.",
  defaultMode: "moon",
};

export const DEFAULT_MOON_MODE: CalendarModeFormValues = {
  label: "Лунный календарь",
  descriptionMd:
    "Фазы Луны и краткие подсказки по дням. Данные редактируются в админке.",
  dataJson: JSON.stringify(
    {
      year: 2026,
      entries: [] as Array<{ date: string; phase?: string; note?: string }>,
    },
    null,
    2,
  ),
};

export const DEFAULT_SEASONS_MODE: CalendarModeFormValues = {
  label: "Сезонный календарь",
  descriptionMd: "Окна сезонов и сезонные работы. Данные редактируются в админке.",
  dataJson: JSON.stringify(
    {
      year: 2026,
      seasons: [] as Array<{
        id: string;
        label: string;
        start?: string;
        end?: string;
        note?: string;
      }>,
    },
    null,
    2,
  ),
};

/** Compact lunar howto — keep in sync with site `DEFAULT_LUNAR_GUIDE` / Nest seed. */
export const DEFAULT_LUNAR_GUIDE = {
  type: "calendarLunarGuide" as const,
  title: "Как пользоваться лунным календарём",
  subtitle: "Кратко о фазах, подкормках и знаках зодиака для посева.",
  phases: [
    {
      id: "new",
      label: "Новолуние",
      imageSrc: "/calendar/moon-phase-new.svg",
      body: "Худшее время для посадок: не сажайте и не пересаживайте. Неблагоприятны три дня — день до, новолуние и день после.",
    },
    {
      id: "waxing",
      label: "Растущая Луна",
      imageSrc: "/calendar/moon-phase-waxing.svg",
      body: "Соки тянутся вверх — лучшее время для надземных культур (зелень, травы, фрукты, овощи, цветы): посадка, пересадка, прививка.",
    },
    {
      id: "full",
      label: "Полнолуние",
      imageSrc: "/calendar/moon-phase-full.svg",
      body: "Один день без посадок и пересадок. Можно полоть, подкармливать и обрабатывать от вредителей.",
    },
    {
      id: "waning",
      label: "Убывающая Луна",
      imageSrc: "/calendar/moon-phase-waning.svg",
      body: "Энергия к корням — работайте с корнеплодами и луковичными.",
    },
  ],
  tips: [
    "Сажайте на рассвете или до обеда.",
    "На растущей Луне — минеральные подкормки; на убывающей — органические.",
  ],
  zodiacGroups: [
    {
      id: "fertile",
      label: "Плодородные",
      signs: [
        { symbol: "♋", name: "Рак" },
        { symbol: "♉", name: "Телец" },
        { symbol: "♏", name: "Скорпион" },
        { symbol: "♓", name: "Рыбы" },
      ],
      body: "Лучшие дни для посева и посадки — всходы сильнее, урожай выше.",
    },
    {
      id: "neutral",
      label: "Нейтральные",
      signs: [
        { symbol: "♍", name: "Дева" },
        { symbol: "♐", name: "Стрелец" },
        { symbol: "♎", name: "Весы" },
        { symbol: "♑", name: "Козерог" },
      ],
      body: "Сеять и сажать можно, урожай скорее средний.",
    },
    {
      id: "barren",
      label: "Неплодородные",
      signs: [
        { symbol: "♊", name: "Близнецы" },
        { symbol: "♒", name: "Водолей" },
        { symbol: "♌", name: "Лев" },
        { symbol: "♈", name: "Овен" },
      ],
      body: "От посева лучше отказаться — полоть и делать другие огородные работы.",
    },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function parseModeId(value: unknown): CalendarModeId {
  return value === "seasons" ? "seasons" : "moon";
}

function extractExtraSections(sections: unknown[]): unknown[] {
  return sections.filter(section => {
    if (!isRecord(section)) {
      return false;
    }
    return (
      section.type !== "calendarIntro" &&
      section.type !== "calendarMode"
    );
  });
}

function ensureLunarGuide(extras: unknown[]): unknown[] {
  const hasGuide = extras.some(
    section => isRecord(section) && section.type === "calendarLunarGuide",
  );
  if (hasGuide) {
    return extras;
  }
  return [...extras, structuredClone(DEFAULT_LUNAR_GUIDE)];
}

export function buildDefaultCalendarSectionsJson(): string {
  return JSON.stringify(
    [
      {
        type: "calendarIntro",
        ...DEFAULT_CALENDAR_INTRO,
      },
      {
        type: "calendarMode",
        mode: "moon",
        label: DEFAULT_MOON_MODE.label,
        descriptionMd: DEFAULT_MOON_MODE.descriptionMd,
        data: JSON.parse(DEFAULT_MOON_MODE.dataJson) as unknown,
      },
      {
        type: "calendarMode",
        mode: "seasons",
        label: DEFAULT_SEASONS_MODE.label,
        descriptionMd: DEFAULT_SEASONS_MODE.descriptionMd,
        data: JSON.parse(DEFAULT_SEASONS_MODE.dataJson) as unknown,
      },
      structuredClone(DEFAULT_LUNAR_GUIDE),
    ],
    null,
    2,
  );
}

export function extractCalendarFormFromSections(sections: unknown[]): {
  intro: CalendarIntroFormValues;
  moon: CalendarModeFormValues;
  seasons: CalendarModeFormValues;
} {
  const intro = { ...DEFAULT_CALENDAR_INTRO };
  const moon = { ...DEFAULT_MOON_MODE };
  const seasons = { ...DEFAULT_SEASONS_MODE };

  for (const section of sections.filter(isRecord)) {
    if (section.type === "calendarIntro") {
      intro.title = asString(section.title, intro.title);
      intro.subtitle = asString(section.subtitle, intro.subtitle);
      intro.defaultMode = parseModeId(section.defaultMode);
      continue;
    }
    if (section.type === "calendarMode") {
      const mode = parseModeId(section.mode);
      const target = mode === "seasons" ? seasons : moon;
      target.label = asString(section.label, target.label);
      target.descriptionMd = asString(section.descriptionMd, target.descriptionMd);
      if ("data" in section) {
        target.dataJson = JSON.stringify(section.data ?? {}, null, 2);
      }
    }
  }

  return { intro, moon, seasons };
}

export function mergeCalendarFormIntoSectionsJson(
  intro: CalendarIntroFormValues,
  moon: CalendarModeFormValues,
  seasons: CalendarModeFormValues,
  existingSectionsJson?: string,
): string {
  let moonData: unknown;
  let seasonsData: unknown;
  try {
    moonData = JSON.parse(moon.dataJson) as unknown;
  } catch {
    throw new Error("moon dataJson: невалидный JSON");
  }
  try {
    seasonsData = JSON.parse(seasons.dataJson) as unknown;
  } catch {
    throw new Error("seasons dataJson: невалидный JSON");
  }

  let extras: unknown[] = [structuredClone(DEFAULT_LUNAR_GUIDE)];
  if (existingSectionsJson?.trim()) {
    try {
      const parsed = JSON.parse(existingSectionsJson) as unknown;
      if (Array.isArray(parsed)) {
        extras = ensureLunarGuide(extractExtraSections(parsed));
      }
    } catch {
      /* keep default guide */
    }
  }

  return JSON.stringify(
    [
      {
        type: "calendarIntro",
        title: intro.title.trim(),
        subtitle: intro.subtitle.trim(),
        defaultMode: intro.defaultMode,
      },
      {
        type: "calendarMode",
        mode: "moon",
        label: moon.label.trim(),
        descriptionMd: moon.descriptionMd,
        data: moonData,
      },
      {
        type: "calendarMode",
        mode: "seasons",
        label: seasons.label.trim(),
        descriptionMd: seasons.descriptionMd,
        data: seasonsData,
      },
      ...extras,
    ],
    null,
    2,
  );
}
