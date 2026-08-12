export type KitchenRecipeStep = {
  title: string;
  instruction: string;
  durationMinutes?: number;
  temperature?: string;
  tip?: string;
};

export type KitchenRecipe = {
  id: string;
  version?: number;
  name: string;
  time: string;
  servings?: number;
  image: string;
  ingredients: string[];
  instructions: string;
  steps?: KitchenRecipeStep[];
  favourite?: boolean;
  source: "diarydock" | "scanned" | "themealdb";
  sourceUrl?: string;
};

export type KitchenCookingProgress = {
  recipeId: string;
  stepIndex: number;
  servings: number;
  timerRemainingSeconds: number;
  timerEndsAt: number | null;
  updatedAt: string;
};

function formatScaledQuantity(value: number) {
  const rounded = Math.round(value * 4) / 4;
  if (Number.isInteger(rounded)) return String(rounded);
  const whole = Math.floor(rounded);
  const fraction = Math.round((rounded - whole) * 4);
  const fractionLabel = fraction === 1 ? "¼" : fraction === 2 ? "½" : fraction === 3 ? "¾" : "";
  return whole > 0 ? `${whole}${fractionLabel}` : fractionLabel || String(rounded);
}

export function scaleRecipeIngredient(ingredient: string, originalServings: number, servings: number) {
  if (servings === originalServings || originalServings < 1) return ingredient;
  const quantityMatch = ingredient.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!quantityMatch) return ingredient;
  const scaled = Number(quantityMatch[1]) * (servings / originalServings);
  return `${formatScaledQuantity(scaled)}${quantityMatch[2]}`;
}

export function normaliseRecipeIngredient(ingredient: string) {
  return ingredient
    .toLowerCase()
    .replace(/[¼½¾]/g, "")
    .replace(/^\d+(?:\.\d+)?\s*(?:x\s*)?/i, "")
    .replace(/^\d+(?:\.\d+)?\s*/i, "")
    .replace(/^(?:g|kg|ml|l|tbsp|tsp|tablespoons?|teaspoons?|cloves?|tins?|cans?)\s+/i, "")
    .replace(/\b(?:fresh|chopped|finely|roughly|large|small|medium)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const starterRecipeSteps: Record<string, KitchenRecipeStep[]> = {
  salmon: [
    {
      title: "Get everything ready",
      instruction: "Take the salmon out of the fridge. Finely chop the herbs, crush the garlic and cut the lemon in half. Pat the salmon dry with kitchen paper.",
      durationMinutes: 5,
      tip: "Dry salmon browns better and helps the seasoning stay in place."
    },
    {
      title: "Heat the oven",
      instruction: "Preheat the oven and place a large roasting tray inside so it becomes hot.",
      durationMinutes: 5,
      temperature: "200°C · 180°C fan · Gas 6"
    },
    {
      title: "Season the salmon",
      instruction: "Put the salmon skin-side down on a board. Rub with half the olive oil, garlic, chopped herbs, salt, pepper and the finely grated zest of half the lemon.",
      durationMinutes: 3
    },
    {
      title: "Prepare the asparagus",
      instruction: "Snap off the woody ends. Carefully remove the hot tray, add the asparagus, drizzle with the remaining oil and season lightly. Place the salmon among the asparagus.",
      durationMinutes: 3
    },
    {
      title: "Roast",
      instruction: "Roast on the middle shelf until the salmon is opaque at the edges and only slightly translucent in the centre.",
      durationMinutes: 12,
      temperature: "200°C · 180°C fan · Gas 6",
      tip: "Thicker fillets may need up to 15 minutes."
    },
    {
      title: "Check it is cooked",
      instruction: "Press the thickest part gently with a fork. The salmon should separate into moist flakes and the asparagus should be tender with a little bite.",
      durationMinutes: 1,
      tip: "If it does not flake easily, return it to the oven for 2 minutes and check again."
    },
    {
      title: "Finish and serve",
      instruction: "Rest the salmon for 2 minutes. Squeeze over fresh lemon juice, spoon over the tray juices and add a final scattering of herbs.",
      durationMinutes: 2
    }
  ],
  roast: [
    {
      title: "Bring the chicken up to temperature",
      instruction: "Remove the chicken from the fridge, unwrap it and pat the skin dry. Leave it in a cool place while you prepare the vegetables.",
      durationMinutes: 20,
      tip: "Do not wash raw chicken."
    },
    {
      title: "Heat the oven",
      instruction: "Preheat the oven. Put a sturdy roasting tin on the middle shelf.",
      durationMinutes: 10,
      temperature: "200°C · 180°C fan · Gas 6"
    },
    {
      title: "Prepare the roast",
      instruction: "Rub the chicken with oil, salt and herbs. Cut the potatoes and carrots into even pieces, toss with oil and season, then arrange them around the chicken.",
      durationMinutes: 15
    },
    {
      title: "Start roasting",
      instruction: "Roast uncovered until the skin begins to turn golden. Baste the chicken and turn the vegetables.",
      durationMinutes: 45,
      temperature: "200°C · 180°C fan · Gas 6"
    },
    {
      title: "Finish roasting",
      instruction: "Continue roasting until the juices run clear and a thermometer inserted into the thickest part of the thigh, without touching bone, reads 75°C.",
      durationMinutes: 35,
      temperature: "190°C · 170°C fan · Gas 5",
      tip: "If the skin browns too quickly, cover it loosely with foil."
    },
    {
      title: "Rest the chicken",
      instruction: "Move the chicken to a warm board, cover loosely with foil and rest before carving. Increase the oven temperature to crisp the potatoes if needed.",
      durationMinutes: 20,
      temperature: "220°C · 200°C fan · Gas 7"
    },
    {
      title: "Cook the sides and serve",
      instruction: "Cook the green beans until tender, heat the Yorkshire puddings and gravy, then carve the chicken and serve everything hot.",
      durationMinutes: 10
    }
  ],
  pasta: [
    {
      title: "Prepare the vegetables",
      instruction: "Halve the tomatoes, slice the courgette, wash the spinach, grate the parmesan and pick the basil leaves.",
      durationMinutes: 5
    },
    {
      title: "Boil the pasta water",
      instruction: "Bring a large saucepan of well-salted water to a rolling boil.",
      durationMinutes: 5,
      temperature: "High heat"
    },
    {
      title: "Cook the pasta",
      instruction: "Add the pasta and cook for 1 minute less than the packet time. Before draining, reserve a mug of the starchy cooking water.",
      durationMinutes: 9,
      temperature: "Boiling",
      tip: "Taste a piece: it should be tender with a slight bite."
    },
    {
      title: "Sauté the vegetables",
      instruction: "Warm the olive oil in a wide frying pan. Cook the courgette until lightly golden, then add the tomatoes and cook until just softened.",
      durationMinutes: 6,
      temperature: "Medium-high heat"
    },
    {
      title: "Bring it together",
      instruction: "Add the drained pasta and spinach to the pan. Toss with a splash of reserved pasta water until the spinach wilts and the sauce lightly coats the pasta.",
      durationMinutes: 2,
      temperature: "Medium heat"
    },
    {
      title: "Finish and serve",
      instruction: "Take the pan off the heat. Fold through parmesan and basil, season with black pepper and serve immediately.",
      durationMinutes: 2
    }
  ],
  curry: [
    {
      title: "Prepare the ingredients",
      instruction: "Peel and cut the sweet potato into 2 cm cubes. Drain the chickpeas, wash the spinach, chop the coriander and cut the lime into wedges.",
      durationMinutes: 8
    },
    {
      title: "Start the rice",
      instruction: "Rinse the rice, cover with the correct amount of water from the packet and bring to the boil. Cover, lower the heat and cook gently.",
      durationMinutes: 12,
      temperature: "Low heat"
    },
    {
      title: "Toast the spices",
      instruction: "Warm a little oil in a deep pan. Add the curry spices and stir continuously until fragrant.",
      durationMinutes: 1,
      temperature: "Medium heat",
      tip: "Do not let the spices burn."
    },
    {
      title: "Cook the sweet potato",
      instruction: "Add the sweet potato and stir to coat it in the spices. Pour in the coconut milk and enough water to loosen the sauce, then bring to a gentle simmer.",
      durationMinutes: 15,
      temperature: "Medium-low heat"
    },
    {
      title: "Add the chickpeas",
      instruction: "Stir in the chickpeas and simmer uncovered until the sweet potato is completely tender and the sauce has thickened.",
      durationMinutes: 10,
      temperature: "Low simmer"
    },
    {
      title: "Finish the curry",
      instruction: "Stir in the spinach until wilted. Taste, season and add lime juice. Fluff the rice with a fork.",
      durationMinutes: 3
    },
    {
      title: "Serve",
      instruction: "Spoon the rice into warm bowls, add the curry and finish with coriander and lime wedges.",
      durationMinutes: 1
    }
  ]
};

export function getKitchenRecipeSteps(recipe: KitchenRecipe): KitchenRecipeStep[] {
  if (recipe.steps?.length) return recipe.steps;
  if (starterRecipeSteps[recipe.id]) return starterRecipeSteps[recipe.id];

  const sentences = recipe.instructions
    .replace(/\r?\n+/g, "|")
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1|")
    .split("|")
    .map(step => step.trim())
    .filter(step => step.length > 3);

  return sentences.map((instruction, index) => {
    const minuteMatch = instruction.match(/(\d+)(?:\s*-\s*(\d+))?\s*(?:minutes?|mins?)/i);
    const temperatureMatch = instruction.match(/(?:\d{2,3}\s*°?\s*C(?:\s*\/\s*\d{2,3}\s*°?\s*C\s*fan)?|gas\s*mark\s*\d+|(?:low|medium(?:-high|-low)?|high)\s+heat)/i);

    return {
      title: index === 0 ? "Prepare" : index === sentences.length - 1 ? "Finish and serve" : `Cook · stage ${index}`,
      instruction,
      durationMinutes: minuteMatch ? Number(minuteMatch[2] || minuteMatch[1]) : undefined,
      temperature: temperatureMatch?.[0]
    };
  });
}

export const starterKitchenRecipes: KitchenRecipe[] = [
  {
    id: "salmon",
    version: 2,
    name: "Lemon herb salmon",
    time: "30 min",
    servings: 4,
    image: "/images/recipe-salmon-stock.jpg",
    ingredients: ["4 salmon fillets", "1 lemon", "2 tbsp chopped fresh herbs", "2 garlic cloves", "2 tbsp olive oil", "250 g asparagus", "Sea salt", "Black pepper"],
    instructions: "Prepare and season the salmon, then roast it with asparagus at 200°C (180°C fan) until it flakes easily. Rest briefly and finish with lemon and herbs.",
    steps: starterRecipeSteps.salmon,
    source: "diarydock"
  },
  {
    id: "roast",
    version: 2,
    name: "Sunday roast chicken",
    time: "1 hr 45",
    servings: 4,
    image: "/images/recipe-roast-stock.jpg",
    ingredients: ["1.6 kg whole chicken", "1 kg potatoes", "500 g carrots", "300 g green beans", "8 Yorkshire puddings", "500 ml gravy", "2 tbsp fresh herbs", "Sea salt"],
    instructions: "Season and roast the chicken with potatoes and carrots, checking that the thickest part reaches 75°C. Rest before carving and serve with beans, Yorkshire puddings and gravy.",
    steps: starterRecipeSteps.roast,
    source: "diarydock"
  },
  {
    id: "pasta",
    version: 2,
    name: "Garden pasta",
    time: "25 min",
    servings: 4,
    image: "/images/recipe-pasta-stock.jpg",
    ingredients: ["320 g pasta", "250 g cherry tomatoes", "1 courgette", "100 g spinach", "60 g parmesan", "1 handful fresh basil", "2 tbsp olive oil", "Black pepper"],
    instructions: "Cook the pasta until al dente while sautéing the vegetables. Toss everything with spinach and pasta water, then finish with parmesan and basil.",
    steps: starterRecipeSteps.pasta,
    source: "diarydock"
  },
  {
    id: "curry",
    version: 2,
    name: "Vegetable curry",
    time: "40 min",
    servings: 4,
    image: "/images/recipe-curry-stock.jpg",
    ingredients: ["1 x 400 g tin chickpeas", "500 g sweet potato", "100 g spinach", "1 x 400 ml tin coconut milk", "2 tbsp curry spices", "250 g rice", "1 handful coriander", "1 lime"],
    instructions: "Toast the spices, simmer the sweet potato in coconut milk, then add chickpeas and spinach. Serve with rice, coriander and lime.",
    steps: starterRecipeSteps.curry,
    source: "diarydock"
  }
];
