import { z } from "zod";

export type ResourceId = "app" | "supabase" | "places" | "maps" | "pagespeed" | "openai";
export type ConfigurationState = "missing" | "invalid" | "present";
export type Environment = Readonly<Record<string, string | undefined>>;

export interface ConfigurationField {
  readonly name: string;
  readonly schema: z.ZodType<string>;
  readonly defaultValue?: string;
}

export interface ResourceDefinition {
  readonly id: ResourceId;
  readonly label: string;
  readonly purpose: string;
  readonly fields: readonly ConfigurationField[];
}

export interface ConfigurationIssue {
  readonly variable: string;
  readonly reason: "missing" | "invalid";
}

// Projeção segura para a UI: contém nomes e estados, nunca valores do ambiente.
export interface ResourceStatus {
  readonly id: ResourceId;
  readonly label: string;
  readonly purpose: string;
  readonly state: ConfigurationState;
  readonly variables: readonly string[];
  readonly issues: readonly ConfigurationIssue[];
}

export function inspectResource(definition: ResourceDefinition, env: Environment): ResourceStatus {
  const issues: ConfigurationIssue[] = [];
  for (const field of definition.fields) {
    const value = env[field.name]?.trim() || field.defaultValue;
    if (!value) {
      issues.push({ variable: field.name, reason: "missing" });
    } else if (!field.schema.safeParse(value).success) {
      // Não devolva erros do parser, que podem incluir dados fornecidos.
      issues.push({ variable: field.name, reason: "invalid" });
    }
  }
  return {
    id: definition.id,
    label: definition.label,
    purpose: definition.purpose,
    state: issues.some((issue) => issue.reason === "invalid") ? "invalid" : issues.length ? "missing" : "present",
    variables: definition.fields.map((field) => field.name),
    issues,
  };
}
