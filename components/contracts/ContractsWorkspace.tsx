"use client";

import { AllContracts } from "./workspace/AllContracts";
import { ContractCancellationGuide } from "./workspace/ContractCancellationGuide";
import { ContractChecks } from "./workspace/ContractChecks";
import { ContractDetail } from "./workspace/ContractDetail";
import { ContractForecast } from "./workspace/ContractForecast";
import { ContractsDashboard } from "./workspace/ContractsDashboard";
import type { ContractsView } from "./workspace/contracts-shared";
import { NewContract } from "./workspace/NewContract";

export function ContractsWorkspace({
  view,
  contractId,
}: {
  view: ContractsView;
  contractId?: string;
}) {
  if (view === "all") return <AllContracts />;
  if (view === "checks") return <ContractChecks />;
  if (view === "new") return <NewContract />;
  if (view === "forecast") return <ContractForecast />;
  if (view === "detail" && contractId)
    return <ContractDetail contractId={contractId} />;
  if (view === "cancel" && contractId)
    return <ContractCancellationGuide contractId={contractId} />;
  return <ContractsDashboard />;
}
