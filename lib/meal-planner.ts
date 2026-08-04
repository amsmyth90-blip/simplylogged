export type MealPlanItem = {
  name: string;
  cookTime: string;
  servings: number;
  note: string;
  imageIndex: number;
  recipeId?: string;
};

export type MealPlan = Record<string, MealPlanItem | null>;

export const defaultMeals: MealPlanItem[] = [
  { name: "Lemon herb salmon", cookTime: "35 min", servings: 3, note: "Seasonal vegetables and baby potatoes.", imageIndex: 0, recipeId: "salmon" },
  { name: "Garden pasta", cookTime: "25 min", servings: 3, note: "Fresh vegetables, herbs and parmesan.", imageIndex: 1, recipeId: "pasta" },
  { name: "Chicken traybake", cookTime: "45 min", servings: 4, note: "Roasted vegetables and herby potatoes.", imageIndex: 2 },
  { name: "Tacos", cookTime: "30 min", servings: 4, note: "Salsa, avocado and crunchy slaw.", imageIndex: 3 },
  { name: "Vegetable curry", cookTime: "35 min", servings: 4, note: "Chickpeas, spinach and steamed rice.", imageIndex: 4, recipeId: "curry" },
  { name: "Homemade pizza", cookTime: "40 min", servings: 4, note: "Garden vegetables and fresh basil.", imageIndex: 5 },
  { name: "Sunday roast", cookTime: "1 hr 30", servings: 4, note: "Roast potatoes, vegetables and gravy.", imageIndex: 6, recipeId: "roast" }
];

export function getMealKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getMonday(date = new Date(), weekOffset = 0) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDates(weekOffset = 0) {
  const monday = getMonday(new Date(), weekOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function getPlannedMeal(plan: MealPlan, date: Date, dayIndex: number) {
  const key = getMealKey(date);
  return Object.prototype.hasOwnProperty.call(plan, key) ? plan[key] : defaultMeals[dayIndex];
}
