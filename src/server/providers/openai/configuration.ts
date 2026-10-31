import type { ResourceDefinition } from "@/domain/configuration";
import { credential, identifier } from "@/server/configuration/rules";

export const openaiDefinition = {
  id: "openai",
  label: "OpenAI",
  purpose: "Rascunhos comerciais com processamento exclusivo no servidor.",
  fields: [
    { name: "OPENAI_API_KEY", schema: credential },
    { name: "OPENAI_MODEL", schema: identifier },
  ],
} as const satisfies ResourceDefinition;
