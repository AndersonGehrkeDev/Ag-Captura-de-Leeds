import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";

// Defesa adicional antes de publicar; só emite caminho/regra, nunca o conteúdo.
// Não substitui a revisão de origem nem garante detectar todo formato de segredo.
const files = [...new Set(execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean))];
const rules = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github_token", /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{30,}\b/],
  ["openai_key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/],
  ["supabase_secret", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["google_key", /\bAIza[A-Za-z0-9_-]{35}\b/],
  ["aws_key", /\bAKIA[A-Z0-9]{16}\b/],
  ["jwt_literal", /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}\b/],
  ["database_credential", /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]{8,}@/],
];
let failed = false;
let scanned = 0;
for (const file of files) {
  if (/(?:^|\/)(?:\.env[^/]*|\.vercel|\.supabase|\.local-data)(?:\/|$)/.test(file) && file !== ".env.example" || /\.(?:pem|key|p12|pfx)$|\.catalog\.local\.json$|(?:^|\/)credentials[^/]*\.json$|(?:^|\/)service-account[^/]*\.json$/i.test(file)) {
    console.error(`${file}: private_file`); failed = true; continue;
  }
  const info = await stat(file);
  if (!info.isFile()) continue;
  const buffer = await readFile(file);
  if (buffer.includes(0)) continue; // Assets binários não são documentos de configuração.
  scanned++;
  const body = buffer.toString("utf8");
  // Única exceção: valor fictício exato do teste que recusa secret key no cliente.
  // Outros valores, inclusive no mesmo arquivo, continuam sendo recusados.
  const inspected = file === "src/domain/auth.test.ts" ? body.replaceAll("sb_secret_" + "synthetic_never_public", "") : body;
  for (const [label, pattern] of rules) if (pattern.test(inspected)) {
    console.error(`${file}: ${label}`); failed = true;
  }
  if (file === ".env.example") for (const line of body.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^[A-Z][A-Z0-9_]*=(?:|false|http:\/\/localhost:3000)$/.test(line)) {
      console.error(".env.example: unexpected_example_value"); failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
else console.log(`Conferência de publicação: ${scanned} arquivos de texto; nenhum padrão de segredo encontrado.`);
