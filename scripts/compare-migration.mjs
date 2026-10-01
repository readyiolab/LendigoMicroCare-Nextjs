// Compares every migrated React source file with its Next.js counterpart and
// reports lines that differ beyond the expected mechanical rewrites.
// Usage: node scripts/compare-migration.mjs [--verbose]
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const root = process.cwd();
const reactSrc = join(root, "..", "frontend", "src");
const verbose = process.argv.includes("--verbose");

const dirMap = { pages: "views" };
const exts = [".jsx", ".js", ".tsx", ".ts"];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function counterpart(rel) {
  const [top, ...rest] = rel.split(/[\\/]/);
  const base = join(root, dirMap[top] ?? top, ...rest);
  const stem = base.slice(0, -extname(base).length);
  for (const ext of exts) if (existsSync(stem + ext)) return stem + ext;
  return null;
}

const normalize = (line) =>
  line
    .replace(/\r$/, "")
    .replace(/import\.meta\.env\.VITE_/g, "process.env.NEXT_PUBLIC_")
    .replace(/import\.meta\.env\.DEV/g, "process.env.NODE_ENV === 'development'")
    .replace(/['"]react-router-dom['"]/g, "'@/lib/router'")
    .trim();

const ignorable = (line) =>
  line === "" ||
  /^['"]use client['"];?$/.test(line) ||
  /^import\s/.test(line) ||
  /^\}\s*from\s/.test(line);

const missing = [];
const changed = [];
for (const file of walk(reactSrc)) {
  if (!exts.includes(extname(file))) continue;
  const rel = relative(reactSrc, file);
  const target = counterpart(rel);
  if (!target) {
    missing.push(rel);
    continue;
  }
  const a = readFileSync(file, "utf8").split("\n").map(normalize).filter((l) => !ignorable(l));
  const b = readFileSync(target, "utf8").split("\n").map(normalize).filter((l) => !ignorable(l));
  if (target.endsWith(".ts") || target.endsWith(".tsx")) continue;
  const bSet = new Map();
  for (const l of b) bSet.set(l, (bSet.get(l) ?? 0) + 1);
  const removed = [];
  for (const l of a) {
    const n = bSet.get(l) ?? 0;
    if (n > 0) bSet.set(l, n - 1);
    else removed.push(l);
  }
  const added = [...bSet.entries()].flatMap(([l, n]) => Array(n).fill(l));
  if (removed.length || added.length) changed.push({ rel, removed, added });
}

console.log(`Not migrated (${missing.length}):`);
for (const m of missing) console.log("  " + m);
console.log(`\nJS files with non-mechanical differences (${changed.length}):`);
for (const c of changed) {
  console.log(`  ${c.rel}  (-${c.removed.length} +${c.added.length})`);
  if (verbose) {
    for (const l of c.removed) console.log("    - " + l);
    for (const l of c.added) console.log("    + " + l);
  }
}
