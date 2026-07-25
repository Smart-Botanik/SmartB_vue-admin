import { graphqlClient } from "@/services/graphql/client";
import type { CalendarDay, CalendarDayGeneralState } from "./calendarDayApi";

export type LunarFacts = {
  date: string;
  moonPhase: string;
  moonZodiacSign: string;
  illumination: number;
  eclipticLongitude: number;
  phaseAngle: number;
  timezone: string;
};

export type AiGenerationStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "APPLIED"
  | "DISCARDED";

export type AiGenerationOutput = {
  title?: string | null;
  bodyMd?: string | null;
  suggestedGeneralState?: CalendarDayGeneralState | null;
  hubTitle?: string | null;
  hubLead?: string | null;
  aboutShort?: string | null;
  seoDescription?: string | null;
};

export type AiGeneration = {
  id: string;
  kind: string;
  status: AiGenerationStatus;
  targetDate?: string | null;
  targetKey?: string | null;
  promptVersion: string;
  output?: AiGenerationOutput | null;
  model?: string | null;
  errorMessage?: string | null;
  appliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LunarCalendarBackfillResult = {
  processed: number;
  generated: number;
  applied: number;
  skipped: number;
  failed: number;
  generationIds: string[];
  dryRun: boolean;
};

const GEN_FIELDS = `
  id kind status targetDate targetKey promptVersion
  output {
    title bodyMd suggestedGeneralState
    hubTitle hubLead aboutShort seoDescription
  }
  model errorMessage appliedAt createdAt updatedAt
`;

export const aiApi = {
  async lunarFacts(date: string, timezone?: string): Promise<LunarFacts> {
    const data = await graphqlClient.request<
      { lunarFacts: LunarFacts },
      { date: string; timezone?: string }
    >({
      query: `query LunarFacts($date: String!, $timezone: String) {
        lunarFacts(date: $date, timezone: $timezone) {
          date moonPhase moonZodiacSign illumination eclipticLongitude phaseAngle timezone
        }
      }`,
      variables: { date, timezone },
      operationName: "LunarFacts",
    });
    return data.lunarFacts;
  },

  async listGenerations(params: {
    kind?: string;
    targetDate?: string;
    targetKey?: string;
    limit?: number;
  }): Promise<AiGeneration[]> {
    const data = await graphqlClient.request<
      { aiGenerations: AiGeneration[] },
      {
        kind?: string;
        targetDate?: string;
        targetKey?: string;
        limit?: number;
      }
    >({
      query: `query AiGenerations(
        $kind: AiGenerationKind
        $targetDate: String
        $targetKey: String
        $limit: Int
      ) {
        aiGenerations(
          kind: $kind
          targetDate: $targetDate
          targetKey: $targetKey
          limit: $limit
        ) {
          ${GEN_FIELDS}
        }
      }`,
      variables: {
        kind: params.kind ?? "LUNAR_CALENDAR_DAY",
        targetDate: params.targetDate,
        targetKey: params.targetKey,
        limit: params.limit ?? 20,
      },
      operationName: "AiGenerations",
    });
    return data.aiGenerations;
  },

  async generateLunarDay(input: {
    date: string;
    timezone?: string;
    notes?: string;
  }): Promise<AiGeneration> {
    const data = await graphqlClient.request<
      { generateLunarCalendarDayContent: AiGeneration },
      { input: typeof input }
    >({
      query: `mutation GenerateLunarCalendarDayContent($input: GenerateLunarCalendarDayInput!) {
        generateLunarCalendarDayContent(input: $input) { ${GEN_FIELDS} }
      }`,
      variables: { input },
      operationName: "GenerateLunarCalendarDayContent",
    });
    return data.generateLunarCalendarDayContent;
  },

  async generateCultureFacetDescription(input: {
    subjectKey: string;
    displayName?: string;
    notes?: string;
    locale?: string;
  }): Promise<AiGeneration> {
    const data = await graphqlClient.request<
      { generateCultureFacetDescription: AiGeneration },
      { input: typeof input }
    >({
      query: `mutation GenerateCultureFacetDescription($input: GenerateCultureFacetDescriptionInput!) {
        generateCultureFacetDescription(input: $input) { ${GEN_FIELDS} }
      }`,
      variables: { input },
      operationName: "GenerateCultureFacetDescription",
    });
    return data.generateCultureFacetDescription;
  },

  async applyGeneration(generationId: string, asDraft = true): Promise<CalendarDay> {
    const data = await graphqlClient.request<
      { applyAiGenerationToCalendarDay: CalendarDay },
      { input: { generationId: string; asDraft: boolean } }
    >({
      query: `mutation ApplyAiGenerationToCalendarDay($input: ApplyAiGenerationToCalendarDayInput!) {
        applyAiGenerationToCalendarDay(input: $input) {
          id date title bodyMd moonPhase moonZodiacSign generalState status publishedAt
          cultureMarks { id taxonomyTagId activityKind favorability note }
          createdAt updatedAt
        }
      }`,
      variables: { input: { generationId, asDraft } },
      operationName: "ApplyAiGenerationToCalendarDay",
    });
    return data.applyAiGenerationToCalendarDay;
  },

  async discardGeneration(id: string): Promise<AiGeneration> {
    const data = await graphqlClient.request<
      { discardAiGeneration: AiGeneration },
      { id: string }
    >({
      query: `mutation DiscardAiGeneration($id: ID!) {
        discardAiGeneration(id: $id) { ${GEN_FIELDS} }
      }`,
      variables: { id },
      operationName: "DiscardAiGeneration",
    });
    return data.discardAiGeneration;
  },

  async runBackfill(input: {
    from: string;
    to: string;
    skipExisting?: boolean;
    autoApply?: boolean;
    dryRun?: boolean;
    limit?: number;
  }): Promise<LunarCalendarBackfillResult> {
    const data = await graphqlClient.request<
      { runLunarCalendarBackfill: LunarCalendarBackfillResult },
      { input: typeof input }
    >({
      query: `mutation RunLunarCalendarBackfill($input: LunarCalendarBackfillInput!) {
        runLunarCalendarBackfill(input: $input) {
          processed generated applied skipped failed generationIds dryRun
        }
      }`,
      variables: { input },
      operationName: "RunLunarCalendarBackfill",
    });
    return data.runLunarCalendarBackfill;
  },
};
