import assert from "node:assert/strict";
import test from "node:test";

import { correctRecipeSearchQuery } from "../lib/recipe-search.ts";

const catalogue = [
  "Spaghetti",
  "Spaghetti Bolognese",
  "Chicken",
  "Broccoli",
  "Lasagna",
];

test("corrects common recipe and ingredient misspellings", () => {
  assert.equal(correctRecipeSearchQuery("spagetti", catalogue), "spaghetti");
  assert.equal(correctRecipeSearchQuery("chiken", catalogue), "chicken");
  assert.equal(correctRecipeSearchQuery("brocoli", catalogue), "broccoli");
  assert.equal(correctRecipeSearchQuery("lasanga", catalogue), "lasagna");
});

test("corrects words inside a longer recipe search", () => {
  assert.equal(correctRecipeSearchQuery("spagetti bolognase", catalogue), "spaghetti bolognese");
});

test("does not rewrite unrelated searches", () => {
  assert.equal(correctRecipeSearchQuery("family stew", catalogue), "family stew");
});
