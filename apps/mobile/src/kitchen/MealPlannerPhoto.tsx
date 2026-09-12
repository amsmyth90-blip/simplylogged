import { useState, type CSSProperties } from "react";
import { defaultKitchenMeals, type KitchenMeal, type KitchenRecipe } from "@diarydock/kitchen";

import thumbnailsImage from "../../../../public/images/weekly-meal-thumbnails.png";
import { MobileIcon } from "@mobile/components/MobileIcon";

function RecipePhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MobileIcon name="leaf" />;
  // Local and remote recipe photos can also be unavailable while offline.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" referrerPolicy="no-referrer"
    onError={() => setFailed(true)}
    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />;
}

export function MealPlannerPhoto({ meal, recipe, position }: {
  meal: KitchenMeal;
  recipe?: KitchenRecipe;
  position: CSSProperties;
}) {
  const image = recipe?.image.trim();
  const preset = !recipe && meal.cookTime !== "No cooking"
    ? defaultKitchenMeals.find(item => item.name.toLowerCase() === meal.name.toLowerCase()) : undefined;
  return <span className="meal-selected-plate" aria-hidden="true" style={{
    ...position, display: "grid", placeItems: "center", overflow: "hidden",
    backgroundColor: "#e1e6d7", color: "#365a3d",
    ...(!image && preset ? {
      backgroundImage: `url(${thumbnailsImage})`, backgroundSize: "100% 700%",
      backgroundPosition: `center ${(preset.imageIndex / 6) * 100}%`,
    } : {}),
  }}>
    {image ? <RecipePhoto key={image} src={image} /> : !preset ? <MobileIcon name="leaf" /> : null}
  </span>;
}
