import "server-only";
import { z } from "zod";

export function openDataEnabled(workspaceId: string) {
  return process.env.OPEN_DATA_CATALOG_ENABLED === "true"
    && z.uuid().safeParse(process.env.OPEN_DATA_WORKSPACE_ID).success
    && process.env.OPEN_DATA_WORKSPACE_ID === workspaceId;
}
