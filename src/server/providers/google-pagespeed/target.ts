import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 && (c === 0 || c === 2) || b === 88 && c === 99) || a === 100 && b >= 64 && b <= 127 || a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
  }
  const parts = address.toLowerCase().split(":");
  // O grupo vazio em 2001:: equivale a zero; NaN não pode contornar o bloqueio.
  const prefix = parseInt(parts[1] || "0", 16);
  return isIP(address) === 6 && /^[23]/i.test(address) && !(parts[0] === "2001" && (prefix <= 0x1ff || prefix === 0xdb8)) && !/^(2002|3fff):/i.test(address);
}
export async function validateAuditTarget(value: string): Promise<URL | null> {
  try {
    const url = new URL(value); const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (value.length > 2048 || !["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.port || isIP(host) || host.includes(":") || !host.includes(".") || /(^|\.)(localhost|local|internal|test|example|invalid)$/.test(host)) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("dns_timeout")), 2500); });
    const addresses = await Promise.race([lookup(host, { all: true, verbatim: true }), timeout]).finally(() => clearTimeout(timer));
    return addresses.length > 0 && addresses.length <= 16 && addresses.every(({ address }) => publicAddress(address)) ? url : null;
  } catch { return null; }
}
