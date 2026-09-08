import type { KitchenRecipe } from "./planning-types.ts";

type StarterInput = Pick<KitchenRecipe,
  "id" | "name" | "time" | "image" | "ingredients" | "instructions" | "sourceUrl">;

function starter(input: StarterInput): KitchenRecipe {
  return {
    ...input,
    contentComplete: true,
    version: 1,
    servings: 4,
    steps: [],
    favourite: false,
    source: "themealdb",
  };
}

export const smartStarterRecipes: KitchenRecipe[] = [
  starter({
    id: "diarydock-starter-salmon-traybake",
    name: "Salmon Prawn Risotto",
    time: "Recipe guide",
    image: "https://www.themealdb.com/images/media/meals/xxrxux1503070723.jpg",
    ingredients: ["50g butter", "1 finely chopped onion", "150g rice", "125ml white wine",
      "1 litre hot vegetable stock", "Juice and zest of 1 lemon", "240g king prawns",
      "150g salmon", "100g blanched asparagus tips", "Ground black pepper",
      "50g Parmesan shavings"],
    instructions: "Melt the butter in a heavy pan and gently soften the onion without colouring it. "
      + "Stir in the rice, then add the wine and cook until absorbed. Gradually add the hot stock, "
      + "stirring until each addition is absorbed and the rice is tender. Season with lemon juice, "
      + "zest and pepper. Stir through the prawns and asparagus to heat them. Grill the salmon, place "
      + "it over the risotto and finish with Parmesan.",
    sourceUrl: "https://www.themealdb.com/meal/52823-salmon-prawn-risotto-recipe",
  }),
  starter({
    id: "diarydock-starter-garden-pasta",
    name: "Spicy Arrabiata Penne",
    time: "15 min",
    image: "https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg",
    ingredients: ["1 pound penne rigate", "1/4 cup olive oil", "3 cloves garlic",
      "1 tin chopped tomatoes", "1/2 teaspoon red chilli flakes",
      "1/2 teaspoon Italian seasoning", "6 basil leaves", "Parmigiano-Reggiano"],
    instructions: "Cook the penne in salted boiling water according to the packet instructions. "
      + "Meanwhile, heat the olive oil in a large skillet. Add the garlic and cook until fragrant. "
      + "Add the tomatoes, chilli flakes, Italian seasoning, salt and pepper. Boil for five minutes, "
      + "then remove from the heat and add the basil. Drain the pasta, toss it through the sauce and "
      + "serve with Parmigiano-Reggiano and extra basil.",
    sourceUrl: "https://www.themealdb.com/meal/52771-spicy-arrabiata-penne-recipe",
  }),
  starter({
    id: "diarydock-starter-chicken-fajitas",
    name: "Chickpea Fajitas",
    time: "30 min",
    image: "https://www.themealdb.com/images/media/meals/tvtxpq1511464705.jpg",
    ingredients: ["400g chickpeas", "1 tablespoon olive oil", "Pinch of paprika",
      "2 small tomatoes, chopped", "1 red onion, finely sliced", "2 teaspoons red wine vinegar",
      "1 avocado", "Juice of 1 lime", "100g soured cream", "2 teaspoons harissa",
      "4 corn tortillas", "Coriander and lime wedges"],
    instructions: "Heat the oven to 200C/180C fan. Dry the chickpeas, toss with oil and paprika, "
      + "then roast for 20 to 25 minutes until crisp. Pickle the tomato and onion in the vinegar. "
      + "Mash the avocado with lime juice and seasoning, and mix the soured cream with harissa. "
      + "Char the tortillas in a hot griddle pan. Fill each tortilla with harissa cream, chickpeas, "
      + "guacamole and salsa, then finish with coriander and lime.",
    sourceUrl: "https://www.themealdb.com/meal/52870-chickpea-fajitas-recipe",
  }),
  starter({
    id: "diarydock-starter-chickpea-curry",
    name: "Vegetarian Casserole",
    time: "40 min",
    image: "https://www.themealdb.com/images/media/meals/vptwyt1511450962.jpg",
    ingredients: ["1 tablespoon rapeseed oil", "1 onion", "3 cloves garlic", "1 teaspoon paprika",
      "1/2 teaspoon cumin", "1 tablespoon dried thyme", "3 carrots", "2 celery stalks",
      "1 red pepper", "1 yellow pepper", "2 x 400g tins tomatoes", "250ml vegetable stock",
      "2 courgettes", "2 thyme sprigs", "250g lentils"],
    instructions: "Heat the oil in a heavy pan and gently soften the onion for 5 to 10 minutes. "
      + "Add the garlic, spices, dried thyme, carrots, celery and peppers and cook for five minutes. "
      + "Add the tomatoes, stock, courgettes and fresh thyme and cook for 20 to 25 minutes. Remove "
      + "the thyme sprigs, stir in the lentils and return to a simmer before serving.",
    sourceUrl: "https://www.themealdb.com/meal/52863-vegetarian-casserole-recipe",
  }),
  starter({
    id: "diarydock-starter-air-fryer-chicken",
    name: "Air Fryer Egg Rolls",
    time: "35 min",
    image: "https://www.themealdb.com/images/media/meals/grhn401765687086.jpg",
    ingredients: ["1 tablespoon olive oil", "1 lb ground pork or chicken", "1 garlic clove",
      "1 tablespoon ginger", "1 medium carrot", "3 scallions", "3 cups cabbage",
      "1 tablespoon soy sauce", "1 tablespoon rice vinegar", "12 egg roll wrappers",
      "Oil for brushing", "Dipping sauce to serve"],
    instructions: "Cook the meat in the olive oil until cooked through. Add the garlic, ginger, "
      + "carrot, scallions and cabbage and cook until softened. Stir in the soy sauce and vinegar, "
      + "then leave the filling to cool. Fill and tightly roll the wrappers, sealing the edges with "
      + "water. Brush with oil and air fry without overlapping at 350F for 6 to 7 minutes. Turn, "
      + "brush again and cook for another 4 to 5 minutes until crisp and golden.",
    sourceUrl: "https://www.themealdb.com/meal/53373-air-fryer-egg-rolls-recipe",
  }),
  starter({
    id: "diarydock-starter-slow-cooker-stew",
    name: "Shawarma Chuck Roast Wrap",
    time: "8–10 hr",
    image: "https://www.themealdb.com/images/media/meals/swo87v1763595282.jpg",
    ingredients: ["1kg chuck roast", "1 cup beef stock", "3 tablespoons lemon juice",
      "1 tablespoon ground cumin", "2 teaspoons paprika", "1 teaspoon salt",
      "1 teaspoon ground ginger", "1 teaspoon turmeric", "1/2 teaspoon cayenne pepper",
      "1/2 teaspoon ground cinnamon", "1/2 teaspoon ground coriander",
      "1/4 teaspoon ground cloves", "Pita and garnishes to serve"],
    instructions: "Combine the spices, beef stock and lemon juice in a slow cooker. Add the beef, "
      + "turn to coat and spoon sauce over it. Cover and cook on low for 8 to 10 hours. Remove the "
      + "beef, discard excess fat and shred with two forks. Skim the cooking liquid and mix the beef "
      + "back into the sauce. Fill pita with garlic sauce, beef and garnishes, fold and grill the wrap.",
    sourceUrl: "https://www.themealdb.com/meal/53217-shawarma-chuck-roast-wrap-recipe",
  }),
  starter({
    id: "diarydock-starter-tomato-soup",
    name: "Creamy Tomato Soup",
    time: "45 min",
    image: "https://www.themealdb.com/images/media/meals/stpuws1511191310.jpg",
    ingredients: ["3 tablespoons olive oil", "2 onions, chopped", "2 celery sticks",
      "300g carrots", "500g potatoes", "4 bay leaves", "5 tablespoons tomato puree",
      "2 tablespoons sugar", "2 tablespoons white vinegar", "1.5kg chopped tomatoes",
      "500g passata", "3 vegetable stock cubes", "400ml whole milk"],
    instructions: "Gently fry the oil, onions, celery, carrots, potatoes and bay leaves for 10 to "
      + "15 minutes. Stir in the tomato puree, sugar, vinegar, tomatoes and passata. Crumble in the "
      + "stock cubes, add one litre of boiling water, cover and simmer for 15 minutes. Remove the bay "
      + "leaves and blend until smooth. Reheat gently with the milk without allowing the soup to boil.",
    sourceUrl: "https://www.themealdb.com/meal/52841-creamy-tomato-soup-recipe",
  }),
];

const startersById = new Map(smartStarterRecipes.map((recipe) => [recipe.id, recipe]));

export function refreshLegacyStarterRecipe(recipe: KitchenRecipe) {
  const replacement = startersById.get(recipe.id);
  if (!replacement || recipe.version !== 1 || recipe.source !== "diarydock" || recipe.image) {
    return recipe;
  }
  return { ...structuredClone(replacement), favourite: recipe.favourite };
}
