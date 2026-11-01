import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// MapLibre 6 procura seu worker ao lado do módulo original. O bundler Next move
// esse módulo: servir explicitamente o worker da mesma versão no próprio domínio.
const require = createRequire(import.meta.url);
const root = dirname(require.resolve("maplibre-gl/package.json"));
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version)) throw new Error("Versão MapLibre inválida.");
const source = join(root, "dist", "maplibre-gl-worker.mjs");
if ((await stat(source)).size > 2 * 1024 * 1024) throw new Error("Worker fora do tamanho esperado.");
const target = join(process.cwd(), "public", "vendor", "maplibre");
await mkdir(target, { recursive: true });
await copyFile(source, join(target, `worker-${version}.mjs`));
await copyFile(join(root, "LICENSE.txt"), join(target, `LICENSE-${version}.txt`));
console.log(`MapLibre ${version}: worker e licença preparados.`);
