"use client";

import { HomeInsuranceClaim } from "./home-insurance/HomeInsuranceClaim";
import { HomeInsuranceCover } from "./home-insurance/HomeInsuranceCover";
import { HomeInsuranceCoverCheck } from "./home-insurance/HomeInsuranceCoverCheck";
import { HomeInsuranceDashboard } from "./home-insurance/HomeInsuranceDashboard";
import { HomeInsuranceInventory } from "./home-insurance/HomeInsuranceInventory";
import type { HomeInsuranceView } from "./home-insurance/home-insurance-shared";

export function HomeInsuranceWorkspace({ view }: { view: HomeInsuranceView }) {
  if (view === "cover") return <HomeInsuranceCover />;
  if (view === "inventory") return <HomeInsuranceInventory />;
  if (view === "high-value") return <HomeInsuranceInventory highValueOnly />;
  if (view === "check") return <HomeInsuranceCoverCheck />;
  if (view === "claim") return <HomeInsuranceClaim />;
  return <HomeInsuranceDashboard />;
}
