import type { ResourceId } from "@/domain/configuration";

export interface FeatureDefinition {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly resources: readonly ResourceId[];
}
