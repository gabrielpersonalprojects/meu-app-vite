/**
 * apply-ui.js
 * - Faz backup do App.tsx
 * - Aplica:
 *   0) remove "topics truncated? no"
 *   1) adiciona const BRAND (se não existir)
 *   2) ajusta container principal (fundo + gradiente)
 *   3) injeta "glows" no topo (estilo AuthPage)
 *   4) padroniza cards glass (somente em padrões comuns)
 *   5) deixa botão Efetuar Lançamento com estilo do login
 *   6) corrige classe de aba ativa (se existir o gradiente antigo)
 */

const fs = require("fs");
const path = require("path");

function findAppTsx() {
  const candidates = [
    path.join(process.cwd(), "src", "App.tsx"),
    path.join(process.cwd(), "App.tsx"),
    path.join(process.cwd(), "src", "app", "App.tsx"),
    path.join(process.cwd(), "src", "pages", "App.tsx"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // Busca recursiva simples (até 6 níveis) pra achar App.tsx
  function walk(dir, depth = 0) {
    if (depth > 6) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist", "build"].includes(e.name)) continue;
        const found = walk(full, depth + 1);
        if (found) return found;
      } else if (e.isFile() && e.name === "App.tsx") {
        return full;
      }
    }
    return null;
  }

  return walk(process.cwd());
}

function ensureOnce(content, needle, insertAfterRegex, blockToInsert) {
  if (content.includes(needle)) return content;
  const m = content.match(insertAfterRegex);
  if (!m) return content;
  const idx = m.index + m[0].length;
  return content.slice(0, idx) + "\n\n" + blockToInsert + "\n" + content.slice(idx);
}

function replaceAllSafe(content, from, to) {
  if (!content.includes(from)) return content;
  return content.split(from).join(to);
}

function main() {
  const appPath = findAppTsx();
  if (!appPath) {
    console.error("❌ Não achei App.tsx no projeto.");
    process.exit(1);
  }

  let code = fs.readFileSync(appPath, "utf8");

  // Backup
  const backupPath = appPath + ".bak";
  if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, code, "utf8");

  let changes = [];

  // 0) Remover linha bugada
  const before0 = code;
  code = code.replace(/\n?[ \t]*topics truncated\?\s*no[ \t]*\n?/gi, "\n");
  if (code !== before0) changes.push('Removi "topics truncated? no"');

  // 1) Inserir BRAND (se não existir)
  const brandBlock = `const BRAND = {
  main: "#662be4",
  mid: "#6e0bff",
  accent: "#b10bff",
};`;

  const before1 = code;
  code = ensureOnce(
    code,
    "const BRAND = {",
    /const\s+COLORS\s*=\s*\[[\s\S]*?\];/m,
    brandBlock
  );
  if (code !== before1) changes.push("Adicionei const BRAND após COLORS");

  // 2) Trocar container principal (se achar o padrão exato antigo)
  const oldContainer =
    `<div className="min-h-screen pb-10 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">`;

  const newContainer =
    `<div
  className="min-h-screen pb-10 relative overflow-hidden transition-colors duration-300
  bg-gradient-to-br from-violet-50 via-indigo-50 to-slate-50
  dark:from-[#07031b] dark:via-slate-950 dark:to-slate-950"
>`;

  const before2 = code;
  code = replaceAllSafe(code, oldContainer, newContainer);
  if (code !== before2) changes.push("Atualizei container principal (fundo/gradiente)");

  // 3) Injetar glows (sem depender do bloco existir)
  // Injeta logo após a abertura do container principal do App (primeiro <div ...min-h-screen...>)
  const glowBlock = `
      {/* Glow (estilo AuthPage) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-44 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-[#662be4]/16 via-[#6e0bff]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-60 -right-52 h-[680px] w-[680px] rounded-full bg-gradient-to-br from-[#b10bff]/14 via-[#6e0bff]/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-white/16 via-white/6 to-transparent blur-3xl dark:from-white/10 dark:via-white/5" />
      </div>
`;

  const before3 = code;
  if (!code.includes("{/* Glow (estilo AuthPage) */")) {
    // tenta achar o primeiro <div ...min-h-screen...> e inserir logo depois
    code = code.replace(
      /<div[\s\S]*?min-h-screen[\s\S]*?>/m,
      (m) => m + glowBlock
    );
    if (code !== before3) changes.push("Injetei glows do AuthPage no App");
  }

  // 4) Padronizar cards glass (somente substituições bem específicas)
  const before4 = code;

  // padrões comuns que você tinha
  code = code.replace(
    /bg-white\s+dark:bg-slate-900/g,
    "bg-white/65 dark:bg-slate-900/55 backdrop-blur-xl"
  );

  code = code.replace(
    /border\s+border-slate-100\s+dark:border-slate-800/g,
    "border border-white/40 dark:border-slate-700/60"
  );

  code = code.replace(
    /shadow-sm/g,
    "shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
  );

  if (code !== before4) changes.push("Padronizei cards para glass (substituições seguras)");

  // 5) Botão Efetuar Lançamento (baseado em onClick handleAddTransaction + texto)
  const before5 = code;
  const launchBtnRegex =
    /<button[\s\S]*?onClick=\{handleAddTransaction\}[\s\S]*?>[\s\S]*?Efetuar Lançamento[\s\S]*?<\/button>/m;

  if (launchBtnRegex.test(code)) {
    code = code.replace(launchBtnRegex, (btn) => {
      // tenta manter disabled={...} se existir
      const disabledMatch = btn.match(/disabled=\{[\s\S]*?\}/m);
      const disabledProp = disabledMatch ? `  ${disabledMatch[0]}\n` : "";

      return `<button
  type="button"
  onClick={handleAddTransaction}
${disabledProp}  className="group relative overflow-hidden w-full py-4 rounded-2xl font-semibold tracking-wide text-white
  transition transform hover:scale-[1.01]
  hover:shadow-[0_14px_40px_rgba(177,11,255,0.22)]
  active:scale-95 disabled:opacity-60"
  style={{
    background: \`linear-gradient(135deg, \${BRAND.main} 0%, \${BRAND.mid} 75%, rgba(177,11,255,0.25) 100%)\`,
    boxShadow: "0 10px 28px rgba(102,43,228,0.22)",
  }}
>
  <span
    aria-hidden="true"
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    style={{
      background: \`linear-gradient(135deg, \${BRAND.main} 0%, \${BRAND.mid} 62%, rgba(177,11,255,0.45) 100%)\`,
    }}
  />
  <span
    aria-hidden="true"
    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    style={{
      background: \`radial-gradient(120% 140% at 85% 85%,
        rgba(177,11,255,0.28) 0%,
        rgba(177,11,255,0.10) 45%,
        rgba(177,11,255,0.00) 70%)\`,
    }}
  />
  <span className="relative">Efetuar Lançamento</span>
</button>`;
    });

    if (code !== before5) changes.push('Atualizei botão "Efetuar Lançamento"');
  }

  // 6) Aba ativa (se tiver exatamente o trecho antigo)
  const before6 = code;
  code = code.replace(
    /bg-gradient-to-br\s+from-indigo-600\s+to-violet-700\s+text-white/g,
    "bg-[linear-gradient(135deg,#662be4_0%,#6e0bff_75%,rgba(177,11,255,0.25)_100%)] text-white border-white/20"
  );
  if (code !== before6) changes.push("Atualizei estilo da aba ativa (gradiente marca)");

  // Salvar
  fs.writeFileSync(appPath, code, "utf8");

  console.log("✅ App.tsx atualizado:", appPath);
  console.log("🧷 Backup criado (ou já existia):", backupPath);
  console.log("📌 Mudanças aplicadas:");
  if (changes.length === 0) console.log(" - (nenhuma mudança detectada — talvez seu App.tsx já esteja diferente dos padrões)");
  else changes.forEach((c) => console.log(" - " + c));

  console.log("\n➡️ Se algo der ruim, restaure o backup:");
  console.log(`   - apague o App.tsx atual`);
  console.log(`   - renomeie App.tsx.bak para App.tsx`);
}

main();
