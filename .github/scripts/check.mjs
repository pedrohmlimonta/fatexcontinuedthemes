/**
 * Conferência do módulo antes de publicar (usada pelos workflows CI e Release).
 *
 * Uso: node .github/scripts/check.mjs [pasta]
 *   pasta — raiz do módulo a conferir (padrão: pasta atual). Na release também é usada no conteúdo do zip.
 *
 * Confere:
 *   - module.json válido e com os campos essenciais;
 *   - todos os arquivos citados no module.json existem (scripts, estilos, idiomas, licença);
 *   - sintaxe dos scripts (carregados pelo Foundry como módulos ES) e dos arquivos de idioma;
 *   - todas as imagens/fontes locais usadas nos url(...) do CSS existem.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] ?? ".");
const errors = [];

const abs = (file) => path.join(root, file);
const rel = (file) => path.relative(root, file).split(path.sep).join("/");
const isFile = (file) => fs.existsSync(abs(file)) && fs.statSync(abs(file)).isFile();

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(abs(file), "utf8"));
  } catch (err) {
    errors.push(`${file}: ${fs.existsSync(abs(file)) ? `JSON inválido (${err.message})` : "arquivo não encontrado"}`);
    return null;
  }
}

function finish(manifest) {
  if (errors.length) {
    console.error(`✖ ${errors.length} problema(s) encontrado(s) em ${root}:\n`);
    for (const error of errors) console.error(`• ${error}\n`);
    // No GitHub Actions, cada problema também vira uma anotação, exibida no resumo do run
    // (em vez de só "Process completed with exit code 1")
    if (process.env.GITHUB_ACTIONS === "true") {
      for (const error of errors) {
        const message = error.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
        console.log(`::error title=Conferência do módulo::${message}`);
      }
    }
    process.exit(1);
  }
  console.log(`✔ ${manifest.id} ${manifest.version}: manifesto, scripts, idiomas e arquivos usados pelo CSS conferidos.`);
}

/* ---------------------------------------------------------------- */
/*  module.json                                                     */
/* ---------------------------------------------------------------- */

const manifest = readJSON("module.json");
if (!manifest) finish(manifest);

for (const key of ["id", "title", "version"]) {
  if (!manifest[key]) errors.push(`module.json: o campo "${key}" está vazio ou ausente`);
}
if (!manifest.compatibility?.minimum) errors.push(`module.json: o campo "compatibility.minimum" está ausente`);

const esmodules = manifest.esmodules ?? [];
const styles = (manifest.styles ?? []).map((style) => (typeof style === "string" ? style : style?.src));
const languages = manifest.languages ?? [];

const referenced = [...esmodules, ...(manifest.scripts ?? []), ...styles, ...languages.map((l) => l.path)];
if (manifest.license && !/^https?:/.test(manifest.license)) referenced.push(manifest.license);
for (const file of referenced) {
  if (!file || !isFile(file)) errors.push(`module.json cita "${file}", que não existe`);
}

/* ---------------------------------------------------------------- */
/*  Scripts e idiomas                                               */
/* ---------------------------------------------------------------- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "module-check-"));
try {
  for (const file of esmodules.filter(isFile)) {
    // A extensão .mjs faz o Node conferir o arquivo como módulo ES, do mesmo jeito que o Foundry o carrega
    const copy = path.join(tmp, `${path.basename(file, path.extname(file))}.mjs`);
    fs.copyFileSync(abs(file), copy);
    try {
      execFileSync(process.execPath, ["--check", copy], { stdio: "pipe" });
    } catch (err) {
      // Mantém só o trecho útil da saída do Node (arquivo:linha, a linha com o erro e a mensagem)
      const lines = String(err.stderr ?? err.message).replaceAll(copy, file).split("\n");
      const end = lines.findIndex((line) => /^\w*Error\b/.test(line));
      errors.push(`${file}: erro de sintaxe\n${lines.slice(0, end >= 0 ? end + 1 : undefined).join("\n").trim()}`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

for (const language of languages) {
  if (language.path && isFile(language.path)) readJSON(language.path);
}

/* ---------------------------------------------------------------- */
/*  Arquivos locais usados pelo CSS                                 */
/* ---------------------------------------------------------------- */

const missing = new Map();
for (const file of styles.filter(isFile)) {
  // Comentários viram espaços (mantendo as posições) para url(...) comentados não contarem
  const css = fs.readFileSync(abs(file), "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));

  for (const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
    let ref = match[2].trim();
    // Endereços externos (https:, data:, //cdn...) e âncoras não são arquivos do módulo
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
    ref = ref.split(/[?#]/)[0];
    try {
      ref = decodeURI(ref);
    } catch {
      /* mantém como está */
    }

    let target;
    const modulePrefix = `/modules/${manifest.id}/`;
    if (ref.startsWith(modulePrefix)) target = abs(ref.slice(modulePrefix.length));
    else if (ref.startsWith("/")) continue; // arquivo de fora do módulo (ex.: /icons/...), não dá para conferir aqui
    else target = path.resolve(path.dirname(abs(file)), ref);

    if (fs.existsSync(target)) continue;

    const theme = [...css.slice(0, match.index).matchAll(/\.theme-([\w-]+)/g)].pop()?.[1];
    const key = rel(target);
    if (!missing.has(key)) missing.set(key, new Set());
    if (theme) missing.get(key).add(theme);
  }
}

if (missing.size) {
  const list = [...missing]
    .map(([file, themes]) => `    - ${file}${themes.size ? `  (tema: ${[...themes].join(", ")})` : ""}`)
    .join("\n");
  errors.push(
    `${missing.size} arquivo(s) usado(s) pelo CSS não existe(m) no módulo:\n${list}\n` +
      `  Copie esses arquivos para as pastas indicadas (ex.: da pasta assets do módulo "fatex-themes" instalado no ` +
      `seu Foundry) ou remova as referências do CSS.`,
  );
}

finish(manifest);
