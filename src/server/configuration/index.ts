import "server-only";
import { inspectResource, type ResourceId, type ResourceStatus } from "@/domain/configuration";
import { resourceDefinitions } from "./definitions";

// Leitura tardia: nenhuma integração é obrigatória na importação ou no build.
export function getConfigurationReport(): ResourceStatus[] {
  return resourceDefinitions.map((definition) => inspectResource(definition, process.env));
}

export class ResourceConfigurationError extends Error {
  constructor(readonly resource: ResourceId) {
    super(`Configuração ausente ou inválida para o recurso: ${resource}.`);
    this.name = "ResourceConfigurationError";
  }
}

// Destinado aos futuros adaptadores no servidor. Não testa acesso remoto.
export function requireResourceConfiguration(id: ResourceId): Readonly<Record<string, string>> {
  const definition = resourceDefinitions.find((item) => item.id === id);
  if (!definition || inspectResource(definition, process.env).state !== "present") {
    throw new ResourceConfigurationError(id);
  }
  return Object.fromEntries(definition.fields.map((field) => [
    field.name,
    process.env[field.name]?.trim() || ("defaultValue" in field ? field.defaultValue : ""),
  ]));
}
