/**
 * Normalize text files to UTF-8 (no BOM) to avoid future encoding glitches.
 * Usage (from repo root):
 *   node scripts/normalize-encoding.js
 * Optionally pass paths to restrict scope:
 *   node scripts/normalize-encoding.js frontend/src backend/src agents.md
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_TARGETS = ["frontend", "backend", "agents.md", "README.md", "docker-compose.yml"];
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".html",
  ".txt",
  ".yml",
  ".yaml",
  ".env",
]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", ".cache", ".vscode"]);

function isBinary(buffer) {
  return buffer.includes(0);
}

function normalizeFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (isBinary(buffer)) return;
  const content = buffer.toString("utf8");
  fs.writeFileSync(filePath, content, { encoding: "utf8", flag: "w" });
  console.log(`normalized: ${filePath}`);
}

function walk(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const basename = path.basename(targetPath);
    if (SKIP_DIRS.has(basename)) return;
    for (const entry of fs.readdirSync(targetPath)) {
      walk(path.join(targetPath, entry));
    }
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(path.basename(targetPath).toLowerCase())) {
    normalizeFile(targetPath);
  }
}

const targets = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_TARGETS;
targets.forEach((t) => {
  if (fs.existsSync(t)) {
    walk(path.resolve(t));
  }
});
