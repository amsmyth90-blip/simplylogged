import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const maximumLines = 300;
const maximumExecutableLineLength = 400;
const strict = process.argv.includes("--strict");
const sourceRoots = [
  "app",
  "components",
  "lib",
  "tests",
  "tools",
  "supabase",
  "apps",
  "packages",
  "services",
  "android/app/src/main/java",
  "android/app/src/test/java",
  "android/app/src/androidTest/java",
  "ios/App/App",
];
const sourceExtensions = new Set([
  ".css", ".java", ".js", ".jsx", ".kt", ".kts", ".mjs", ".mts",
  ".sql", ".swift", ".ts", ".tsx",
]);
const executableExtensions = new Set([
  ".java", ".js", ".jsx", ".kt", ".kts", ".mjs", ".mts", ".swift", ".ts", ".tsx",
]);
const executableRoots = ["app/", "apps/", "components/", "lib/", "packages/", "services/"];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".claude",
  "node_modules",
  "build",
  "coverage",
  "dist",
  "output",
  "playwright-report",
  "public",
  "test-results",
]);

function normalise(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function countPhysicalLines(source) {
  if (!source.length) return 0;
  return source.split(/\r?\n/).length;
}

function executableLineViolation(file, source) {
  if (!executableExtensions.has(path.extname(file))) return null;
  if (!executableRoots.some((prefix) => file.startsWith(prefix))) return null;
  const lines = source.split(/\r?\n/);
  const index = lines.findIndex((line) => line.length > maximumExecutableLineLength);
  if (index < 0) return null;
  return `${file}:${index + 1} is ${lines[index].length} characters (maximum ${maximumExecutableLineLength})`;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function loadBaseline() {
  const baselinePath = path.join(root, "tools", "source-size-baseline.json");
  const baselineSource = await readFile(baselinePath, "utf8");
  return JSON.parse(baselineSource);
}

async function main() {
  const baseline = strict ? {} : await loadBaseline();
  const files = [];

  for (const sourceRoot of sourceRoots) {
    const directory = path.join(root, sourceRoot);
    try {
      files.push(...await collectFiles(directory));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const counts = new Map();
  const densityViolations = [];
  for (const file of files) {
    const relativeFile = normalise(file);
    const source = await readFile(file, "utf8");
    counts.set(relativeFile, countPhysicalLines(source));
    const densityViolation = executableLineViolation(relativeFile, source);
    if (densityViolation) densityViolations.push(densityViolation);
  }

  const violations = [...densityViolations];
  for (const [file, lines] of counts) {
    if (lines <= maximumLines) continue;
    const expected = baseline[file];

    if (strict || expected === undefined) {
      violations.push(`${file}: ${lines} lines (maximum ${maximumLines})`);
      continue;
    }

    if (lines !== expected) {
      violations.push(`${file}: ${lines} lines (ratchet baseline is ${expected}; reduce it and update the baseline)`);
    }
  }

  for (const [file, expected] of Object.entries(baseline)) {
    const actual = counts.get(file);
    if (actual === undefined) {
      violations.push(`${file}: baseline entry is obsolete because the file no longer exists`);
    } else if (actual <= maximumLines) {
      violations.push(`${file}: now ${actual} lines; remove its obsolete ${expected}-line baseline entry`);
    }
  }

  if (violations.length) {
    console.error(`Source-size check failed with ${violations.length} violation(s):`);
    for (const violation of violations.sort()) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  const oversized = [...counts.values()].filter((lines) => lines > maximumLines).length;
  console.log(`Source-size check passed (${counts.size} files, ${oversized} ratcheted legacy file(s)).`);
}

await main();
