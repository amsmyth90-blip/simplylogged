import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parse } from "yaml";

const workflowRoot = new URL("../.github/workflows/", import.meta.url);

async function workflow(name: string) {
  const source = await readFile(new URL(name, workflowRoot), "utf8");
  return { source, value: parse(source) as Record<string, unknown> };
}

test("continuous verification runs the complete gate with least privilege", async () => {
  const { source, value } = await workflow("verify.yml");
  assert.deepEqual(value.permissions, { contents: "read" });
  assert.match(source, /pull_request:/);
  assert.match(source, /push:[\s\S]*- main/);
  assert.match(source, /run: npm ci/);
  assert.match(source, /run: npm run check/);
  assert.match(source, /persist-credentials: false/);
});

test("security workflows use immutable first-party actions and narrow permissions", async () => {
  for (const name of ["verify.yml", "codeql.yml", "dependency-review.yml"]) {
    const { source } = await workflow(name);
    const uses = [...source.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]!);
    assert.ok(uses.length > 0, `${name} must declare its actions`);
    for (const action of uses) {
      assert.match(action, /^(actions|github)\/[a-z0-9-]+(?:\/[a-z0-9-]+)?@[a-f0-9]{40}$/i);
    }
  }

  const codeql = await workflow("codeql.yml");
  assert.deepEqual(codeql.value.permissions, { contents: "read", "security-events": "write" });
  assert.match(codeql.source, /javascript-typescript/);
  assert.match(codeql.source, /java-kotlin/);
  assert.match(codeql.source, /queries: security-extended/);

  const dependencies = await workflow("dependency-review.yml");
  assert.deepEqual(dependencies.value.permissions, { contents: "read" });
  assert.match(dependencies.source, /fail-on-severity: moderate/);
  assert.match(dependencies.source, /fail-on-scopes: runtime, development, unknown/);
});

test("Dependabot maintains application and workflow dependencies", async () => {
  const source = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  const config = parse(source) as { updates?: Array<Record<string, unknown>> };
  assert.deepEqual(config.updates?.map((item) => item["package-ecosystem"]), [
    "github-actions",
    "npm",
  ]);
  assert.ok(config.updates?.every((item) => item.directory === "/"));
});
