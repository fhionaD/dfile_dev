/**
 * Copies Next.js static export (out/) into DFile.backend/wwwroot/.
 * Replaces robocopy so this works on Windows, macOS, and Linux CI.
 */
const fs = require("fs");
const path = require("path");

const frontendRoot = path.join(__dirname, "..");
const outDir = path.join(frontendRoot, "out");
const destDir = path.join(frontendRoot, "..", "DFile.backend", "wwwroot");

/**
 * Drop <link rel="preload" as="style" href=".../_next/static/chunks/*.css"> when present.
 * Next often inlines the same CSS (inlineCss); keeping preload triggers Chrome console warnings.
 */
function stripRedundantCssPreloads(html) {
  return html.replace(/<link\b[^>]*>/gi, (full) => {
    if (!/\brel\s*=\s*["']preload["']/i.test(full)) return full;
    if (!/\bas\s*=\s*["']style["']/i.test(full)) return full;
    if (
      !/\bhref\s*=\s*["'][^"']*\/_next\/static\/chunks\/[^"']*\.css["']/i.test(
        full
      )
    )
      return full;
    return "";
  });
}

function processHtmlTree(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      processHtmlTree(full);
    } else if (e.name.endsWith(".html")) {
      const raw = fs.readFileSync(full, "utf8");
      const next = stripRedundantCssPreloads(raw);
      if (next !== raw) {
        fs.writeFileSync(full, next, "utf8");
      }
    }
  }
}

if (!fs.existsSync(outDir)) {
  console.error("[copy-wwwroot] Missing out/ directory. Run `next build` first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(destDir), { recursive: true });
fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(outDir, destDir, { recursive: true });

// Match old robocopy /XD dev — drop dev-only export if present
const devDir = path.join(destDir, "dev");
if (fs.existsSync(devDir)) {
  fs.rmSync(devDir, { recursive: true, force: true });
}

processHtmlTree(destDir);

console.log("[copy-wwwroot] OK →", destDir);
