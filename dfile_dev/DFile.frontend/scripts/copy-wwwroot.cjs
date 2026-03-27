/**
 * Copies Next.js static export (out/) into DFile.backend/wwwroot/.
 * Replaces robocopy so this works on Windows, macOS, and Linux CI.
 */
const fs = require("fs");
const path = require("path");

const frontendRoot = path.join(__dirname, "..");
const outDir = path.join(frontendRoot, "out");
const destDir = path.join(frontendRoot, "..", "DFile.backend", "wwwroot");

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

console.log("[copy-wwwroot] OK →", destDir);
