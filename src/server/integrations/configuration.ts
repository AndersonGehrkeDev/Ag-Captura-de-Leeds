import "server-only";
import { readIntegrationFlags } from "@/domain/integrations/flags";

// Não são publicáveis nem equivalem a credenciais/licenças. Leitura tardia, sem chamadas remotas.
export function getIntegrationFlags() { return readIntegrationFlags(process.env); }
