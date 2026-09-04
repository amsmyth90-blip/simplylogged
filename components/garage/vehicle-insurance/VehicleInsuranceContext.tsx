import { createContext, useContext, type ReactNode } from "react";

import {
  useVehicleInsurance,
  type VehicleInsuranceModel,
} from "@/components/garage/vehicle-insurance/useVehicleInsurance";

const VehicleInsuranceContext = createContext<VehicleInsuranceModel | null>(
  null,
);

export function VehicleInsuranceProvider({
  children,
  vehicleId,
}: {
  children: ReactNode;
  vehicleId: string;
}) {
  const model = useVehicleInsurance(vehicleId);
  return (
    <VehicleInsuranceContext.Provider value={model}>
      {children}
    </VehicleInsuranceContext.Provider>
  );
}

export function useVehicleInsuranceModel() {
  const model = useContext(VehicleInsuranceContext);
  if (!model) throw new Error("Vehicle insurance context is unavailable.");
  return model;
}
