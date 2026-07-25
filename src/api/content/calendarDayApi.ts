import { graphqlClient } from "@/services/graphql/client";

export type CalendarDayGeneralState = "GOOD" | "NEUTRAL" | "BAD";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type CalendarDayMarkSummary = {
  favorableCount: number;
  neutralCount: number;
  unfavorableCount: number;
};

export type CalendarDayListItem = {
  id: string;
  date: string;
  title?: string | null;
  moonPhase?: string | null;
  moonZodiacSign?: string | null;
  generalState: CalendarDayGeneralState;
  status: ContentStatus;
  publishedAt?: string | null;
  markSummary: CalendarDayMarkSummary;
  createdAt: string;
  updatedAt: string;
};

export type CalendarDayCultureMark = {
  id: string;
  taxonomyTagId: string;
  activityKind: string;
  favorability: string;
  note?: string | null;
};

export type CalendarDay = {
  id: string;
  date: string;
  title?: string | null;
  bodyMd: string;
  moonPhase?: string | null;
  moonZodiacSign?: string | null;
  generalState: CalendarDayGeneralState;
  status: ContentStatus;
  publishedAt?: string | null;
  cultureMarks: CalendarDayCultureMark[];
  createdAt: string;
  updatedAt: string;
};

export type UpsertCalendarDayInput = {
  date: string;
  title?: string | null;
  bodyMd?: string | null;
  moonPhase?: string | null;
  moonZodiacSign?: string | null;
  generalState?: CalendarDayGeneralState | null;
  status?: ContentStatus | null;
};

const LIST_FIELDS = `
  id date title moonPhase moonZodiacSign generalState status publishedAt
  markSummary { favorableCount neutralCount unfavorableCount }
  createdAt updatedAt
`;

const DAY_FIELDS = `
  id date title bodyMd moonPhase moonZodiacSign generalState status publishedAt
  cultureMarks { id taxonomyTagId activityKind favorability note }
  createdAt updatedAt
`;

export const calendarDayApi = {
  async listDays(params: {
    from: string;
    to: string;
    status?: ContentStatus;
  }): Promise<CalendarDayListItem[]> {
    const data = await graphqlClient.request<
      { calendarDays: CalendarDayListItem[] },
      typeof params
    >({
      query: `query CalendarDays($from: String!, $to: String!, $status: ContentStatus) {
        calendarDays(from: $from, to: $to, status: $status) { ${LIST_FIELDS} }
      }`,
      variables: params,
      operationName: "CalendarDays",
    });
    return data.calendarDays;
  },

  async getDay(date: string): Promise<CalendarDay | null> {
    try {
      const data = await graphqlClient.request<
        { calendarDay: CalendarDay },
        { date: string }
      >({
        query: `query CalendarDay($date: String!) {
          calendarDay(date: $date) { ${DAY_FIELDS} }
        }`,
        variables: { date },
        operationName: "CalendarDay",
      });
      return data.calendarDay;
    } catch {
      return null;
    }
  },

  async upsertDay(input: UpsertCalendarDayInput): Promise<CalendarDay> {
    const data = await graphqlClient.request<
      { upsertCalendarDay: CalendarDay },
      { input: UpsertCalendarDayInput }
    >({
      query: `mutation UpsertCalendarDay($input: UpsertCalendarDayInput!) {
        upsertCalendarDay(input: $input) { ${DAY_FIELDS} }
      }`,
      variables: { input },
      operationName: "UpsertCalendarDay",
    });
    return data.upsertCalendarDay;
  },

  async publishDay(date: string): Promise<CalendarDay> {
    const data = await graphqlClient.request<
      { publishCalendarDay: CalendarDay },
      { date: string }
    >({
      query: `mutation PublishCalendarDay($date: String!) {
        publishCalendarDay(date: $date) { ${DAY_FIELDS} }
      }`,
      variables: { date },
      operationName: "PublishCalendarDay",
    });
    return data.publishCalendarDay;
  },

  async unpublishDay(date: string): Promise<CalendarDay> {
    const data = await graphqlClient.request<
      { unpublishCalendarDay: CalendarDay },
      { date: string }
    >({
      query: `mutation UnpublishCalendarDay($date: String!) {
        unpublishCalendarDay(date: $date) { ${DAY_FIELDS} }
      }`,
      variables: { date },
      operationName: "UnpublishCalendarDay",
    });
    return data.unpublishCalendarDay;
  },
};
