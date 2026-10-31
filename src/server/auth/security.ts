import "server-only";
import { headers } from "next/headers";
import { getAuthConfiguration } from "./configuration";

export async function verifyActionOrigin() {
  const { origin } = getAuthConfiguration();
  if (!origin || (await headers()).get("origin") !== origin) throw new Error("Origem da solicitação não autorizada.");
}
