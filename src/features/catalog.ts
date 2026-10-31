import { prospeccao } from "./prospeccao/definition";
import { mapas } from "./mapas/definition";
import { auditorias } from "./auditorias/definition";
import { ia } from "./ia/definition";
import { crm } from "./crm/definition";
import { campanhas } from "./campanhas/definition";
import { relatorios } from "./relatorios/definition";
import { configuracoes } from "./configuracoes/definition";
import type { FeatureDefinition } from "./types";

export const features: readonly FeatureDefinition[] = [
  prospeccao, mapas, auditorias, ia, crm, campanhas, relatorios, configuracoes,
];
