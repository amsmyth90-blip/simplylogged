"use client";

import { ModalShell } from "@/components/ModalShell";

import { TripWizardStep } from "./TripWizardSteps";
import { useCreateTripWizard } from "./useCreateTripWizard";

const steps = ["Details", "Travellers", "Transport", "Stay", "Set up"];

export function CreateTripWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const controller = useCreateTripWizard(onClose);
  const { step, setStep, error, save, continueToNextStep, close } = controller;
  return (
    <ModalShell
      open={open}
      title="Create a trip"
      subtitle={`Step ${step} of 5 · ${steps[step - 1]}`}
      onClose={close}
      footer={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void save(true)} className="min-h-12 rounded-2xl border border-[#2f5140]/20 bg-white text-sm font-semibold text-[#2f5140]">Save draft</button>
            {step < 5 ? (
              <button type="button" onClick={continueToNextStep} className="min-h-12 rounded-2xl bg-[#2f5140] text-sm font-semibold text-white">Continue</button>
            ) : (
              <button type="button" onClick={() => void save(false)} className="min-h-12 rounded-2xl bg-[#2f5140] text-sm font-semibold text-white">Create trip</button>
            )}
          </div>
          {step > 1 ? <button type="button" onClick={() => setStep(value => Math.max(1, value - 1))} className="min-h-11 w-full text-xs font-semibold text-[#667068]">Back</button> : null}
        </div>
      }
    >
      <div className="mb-5 flex gap-1" aria-label={`Step ${step} of 5`}>
        {steps.map((label, index) => <span key={label} className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-[#4f7655]" : "bg-[#e1e3dc]"}`} />)}
      </div>
      <TripWizardStep controller={controller} />
      {error ? <p role="alert" className="mt-4 rounded-xl bg-[#f8e7e2] px-3 py-2 text-xs font-medium text-[#8a5145]">{error}</p> : null}
    </ModalShell>
  );
}
