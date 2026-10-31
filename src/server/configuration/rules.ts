import { z } from "zod";

// Não é uma verificação de autenticidade da credencial nem uma chamada ao provedor.
export const credential = z.string().min(1).max(8192)
  .refine((value) => !/\s/.test(value))
  .refine((value) => !/^(?:<.*>|\$\{.*\}|(?:sua?|your|example|exemplo|placeholder|replace|troque|change[-_]?me)(?:[-_].*)?)$/i.test(value));

export const identifier = credential.max(256);

export function httpUrl(httpsOnly = false) {
  return z.string().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return (httpsOnly ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol))
        && !url.username && !url.password && !url.search && !url.hash;
    } catch {
      return false;
    }
  });
}
