import { z } from "zod";
import { detailsRequestSchema, searchRequestSchema, type CompanyRecord, type SearchPage } from "./contracts";

export const searchApiRequestSchema = z.discriminatedUnion("operation", [
  z.strictObject({ operation: z.literal("options"), workspaceId: z.uuid().toLowerCase() }),
  z.strictObject({ operation: z.literal("search"), workspaceId: z.uuid().toLowerCase(), request: searchRequestSchema }),
  z.strictObject({ operation: z.literal("details"), workspaceId: z.uuid().toLowerCase(), request: detailsRequestSchema }),
  z.strictObject({ operation: z.literal("maps_link"), workspaceId: z.uuid().toLowerCase(), request: detailsRequestSchema }),
]);
export type SearchApiRequest = z.infer<typeof searchApiRequestSchema>;
export interface SearchOptions {
  sources: { id: string; label: string; locations: { id: string; label: string; radiusAvailable: boolean; attributions: string[] }[] }[];
}
export interface LoadedSearchPage extends SearchPage {
  state: "empty" | "complete" | "partial" | "limit_reached";
  excludedWithoutCoordinates: number;
  scope: string;
  scopeAttributions: string[];
}
export type SearchApiData = SearchOptions | LoadedSearchPage | CompanyRecord | { url: string };
