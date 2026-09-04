import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("recipe catalogue access is authenticated, bounded and privately observed", async () => {
  const route = await read("app/api/kitchen/recipes/search/route.ts");
  assert.match(route, /authenticateHybridRequest\(request\)/);
  assert.match(route, /createRateLimitKey\(\s*"api:kitchen:recipe-search", auth\.user\.id\)/);
  assert.match(route, /query\.length > 80/);
  assert.match(route, /readBoundedJsonResponse\(response, 512 \* 1024\)/);
  assert.match(route, /AbortSignal\.timeout\(15_000\)/);
  assert.match(route, /\.slice\(0, 12\)/);
  assert.match(route, /mobileCorsHeaders/);
  assert.match(route, /RequestObservation/);
  assert.match(route, /X-Content-Type-Options/);
  assert.doesNotMatch(route, /response\.json\(\)/);
});

test("recipe scans stream one verified image into a bounded AI contract", async () => {
  const route = await read("app/api/kitchen/recipes/scan/route.ts");
  assert.match(route, /authenticateHybridRequest\(request\)/);
  assert.match(route, /readBoundedSingleFile/);
  assert.match(route, /maximumBytes: MAX_RECIPE_IMAGE_BYTES/);
  assert.match(route, /maximumTransportBytes: MAX_RECIPE_IMAGE_BYTES \+ 64 \* 1024/);
  assert.match(route, /inspectCaptureFile/);
  assert.match(route, /supportedImages/);
  assert.match(route, /Buffer\.byteLength\(ai\.output_text, "utf8"\) > 128 \* 1024/);
  assert.match(route, /parseKitchenRecipe/);
  assert.match(route, /AbortSignal\.timeout\(45_000\)/);
  assert.ok(route.indexOf("const validated = parsedRecipe(scanned, null)")
    < route.indexOf("findPhoto(validated.name)"));
  assert.doesNotMatch(route, /request\.formData\(\)/);
  assert.ok(route.indexOf("authenticateHybridRequest(request)")
    < route.indexOf("!process.env.OPENAI_API_KEY"));
});

test("packaged recipe discovery validates every response before saving", async () => {
  const [client, discovery, book] = await Promise.all([
    read("apps/mobile/src/kitchen/recipe-discovery-client.ts"),
    read("apps/mobile/src/kitchen/RecipeDiscovery.tsx"),
    read("apps/mobile/src/kitchen/RecipeBook.tsx"),
  ]);
  assert.match(client, /readBoundedJsonResponse\(response, 256 \* 1024\)/);
  assert.match(client, /Authorization: authorization\(accessToken\)/);
  assert.match(client, /requestDeadline\(60_000\)/);
  assert.match(client, /file\.size > 4 \* 1024 \* 1024/);
  assert.match(client, /body\.recipes\.map\(parseKitchenRecipe\)/);
  assert.match(client, /parseKitchenRecipe\(body\.recipe\)/);
  assert.match(discovery, /searchMobileRecipes/);
  assert.match(discovery, /scanMobileRecipe/);
  assert.match(discovery, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(book, /operation: "SAVE_RECIPE"/);
});
