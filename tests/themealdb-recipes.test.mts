import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { exactMealDbMatch, mealDbRecipeUrl } from "../lib/kitchen/themealdb.ts";

test("TheMealDB photos are used only for an exact recipe-title match", () => {
  const exact = { idMeal: "52870", strMeal: "Chickpea Fajitas",
    strMealThumb: "https://www.themealdb.com/images/fajitas.jpg" };
  const payload = { meals: [
    { idMeal: "999", strMeal: "Chicken Fajitas",
      strMealThumb: "https://www.themealdb.com/images/chicken.jpg" },
    exact,
  ] };
  assert.deepEqual(exactMealDbMatch(payload, "chickpea fajitas"), exact);
  assert.equal(exactMealDbMatch(payload, "Unrelated recipe"), null);
  assert.equal(mealDbRecipeUrl(exact),
    "https://www.themealdb.com/meal/52870-chickpea-fajitas-recipe");
});

test("the native image policy and recipe page visibly attribute TheMealDB", async () => {
  const [html, book] = await Promise.all([
    readFile(new URL("../apps/mobile/index.html", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/kitchen/RecipeBook.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(html, /img-src[^;]+https:\/\/www\.themealdb\.com/);
  assert.match(book, /Recipe source · TheMealDB/);
  assert.match(book, /Browser\.open/);
});
