"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useDiaryDockData } from "@/components/DiaryDockDataProvider";
import { BillsCard } from "@/components/bills/BillsUi";
import { GarageVehicleSectionNav } from "@/components/garage/GarageVehicleSectionNav";
import {
  VehicleCostsPanel,
  type VehicleCostView,
} from "@/components/garage/VehicleCostsPanel";
import { VehicleDocumentsView } from "@/components/garage/VehicleDocumentsView";
import {
  VehicleRepairsView,
  VehicleServicingView,
} from "@/components/garage/VehicleMaintenanceViews";
import { VehicleNotesView } from "@/components/garage/VehicleNotesView";
import { VehicleOverviewView } from "@/components/garage/VehicleOverviewView";
import { VehicleProfileDialogs } from "@/components/garage/VehicleProfileDialogs";
import {
  EmptyState,
  VehicleHeader,
} from "@/components/garage/VehicleProfileUi";
import {
  VehicleChooser,
  VehicleHero,
  VehicleLocalTabs,
} from "@/components/garage/VehicleProfileTop";
import {
  audit,
  cleanText,
  emptyServiceDraft,
  profileTabs,
  serviceTabs,
  type VehicleTab,
} from "@/components/garage/vehicle-profile-model";
import {
  vehicleActionLabels,
  vehiclePageTitles,
} from "@/components/garage/vehicle-profile-page-model";
import { useVehicleProfileEditor } from "@/components/garage/useVehicleProfileEditor";
import { useVehicleProfileIntegrations } from "@/components/garage/useVehicleProfileIntegrations";
import type { VaultDocument } from "@/lib/mock-data";
import { latestMileage, vehicleDisplayName } from "@/lib/vehicle-records";

export type { VehicleTab } from "@/components/garage/vehicle-profile-model";

type Props = {
  vehicleId: string;
  initialTab?: VehicleTab;
  initialCostsView?: VehicleCostView;
};

export function VehicleProfileWorkspace({
  vehicleId,
  initialTab = "overview",
  initialCostsView = "overview",
}: Props) {
  const router = useRouter();
  const { state, hydrated } = useDiaryDockData();
  const editor = useVehicleProfileEditor(vehicleId);
  const vehicle = state.vehicles.vehicles.find((item) => item.id === vehicleId);
  const vehicleName = vehicle
    ? cleanText(vehicleDisplayName(vehicle))
    : "Vehicle Profile";
  const integrations = useVehicleProfileIntegrations({
    vehicleId,
    vehicleName,
    setMessage: editor.setMessage,
    setDialog: editor.setDialog,
  });

  const garageDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(vehicle.documentIds);
    return state.vaultDocuments.filter((document) => linked.has(document.id));
  }, [state.vaultDocuments, vehicle]);

  const unlinkedGarageDocuments = useMemo(() => {
    if (!vehicle) return [];
    const linked = new Set(
      state.vehicles.vehicles.flatMap((item) => item.documentIds),
    );
    return state.vaultDocuments.filter(
      (document) =>
        (document.roomId === "garage" || document.roomName === "Garage") &&
        !linked.has(document.id),
    );
  }, [state.vaultDocuments, state.vehicles.vehicles, vehicle]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-[760px] rounded-[28px] bg-white/75 p-8 text-sm text-[#667068]">
        Opening this vehicle profile…
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="mx-auto w-full max-w-[760px] space-y-5 pb-28">
        <VehicleHeader title="Vehicle not found" />
        <BillsCard>
          <EmptyState
            icon="car"
            title="This vehicle is not available"
            detail="It may have been removed or may belong to another DiaryDock account."
            action={
              <Link
                href="/room/garage"
                className="inline-flex min-h-11 items-center rounded-[14px] bg-[#2f5140] px-4 text-sm font-semibold text-white"
              >
                Back to Garage
              </Link>
            }
          />
        </BillsCard>
      </div>
    );
  }

  const primaryPhoto = vehicle.primaryPhotoDocumentId
    ? state.vaultDocuments.find(
        (document) => document.id === vehicle.primaryPhotoDocumentId,
      )
    : undefined;
  const photoDocuments = garageDocuments.filter(
    (document) => document.kind === "Image",
  );
  const regularDocuments = garageDocuments.filter(
    (document) => document.kind !== "Image",
  );
  const mileage = latestMileage(vehicle);
  const localTabs =
    initialTab === "servicing" || initialTab === "repairs"
      ? serviceTabs
      : initialTab === "overview" || initialTab === "notes"
        ? profileTabs
        : [];

  const openService = (kind: "service" | "repair", keepNextDate = false) => {
    editor.setServiceDraft({
      ...emptyServiceDraft,
      kind,
      nextServiceDate: keepNextDate ? vehicle.nextServiceDate : "",
    });
    editor.setDialog("service");
  };
  const openNote = (kind: "general" | "emergency") => {
    editor.setNoteDraft({ kind, title: "", content: "" });
    editor.setDialog("note");
  };
  const headerAction = () => {
    if (initialTab === "overview") editor.openVehicleEditor();
    if (initialTab === "servicing") openService("service");
    if (initialTab === "repairs") openService("repair");
    if (initialTab === "costs") editor.openNewExpense();
    if (initialTab === "documents") router.push("/capture?room=garage");
    if (initialTab === "notes") openNote("general");
  };
  const linkDocument = (document: VaultDocument) =>
    editor.updateVehicle((current) => ({
      ...current,
      documentIds: [document.id, ...current.documentIds],
      audit: [
        audit(`Document linked: ${cleanText(document.title)}`),
        ...current.audit,
      ],
      updatedAt: new Date().toISOString(),
    }));

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-4 pb-28">
      <VehicleHeader
        title={vehiclePageTitles[initialTab] || vehicleName}
        actionLabel={vehicleActionLabels[initialTab]}
        onEdit={headerAction}
        onMore={() => editor.setMoreOpen((open) => !open)}
        moreOpen={editor.moreOpen}
      />
      <GarageVehicleSectionNav vehicleId={vehicle.id} />
      <VehicleChooser
        vehicles={state.vehicles.vehicles}
        selectedId={vehicle.id}
      />
      <VehicleHero
        vehicle={vehicle}
        vehicleName={vehicleName}
        primaryPhoto={primaryPhoto}
        tab={initialTab}
        mileage={mileage}
        uploadingPhoto={integrations.uploadingPhoto}
        onPhoto={integrations.addPhoto}
      />
      {editor.message ? (
        <p
          role="alert"
          className="rounded-[16px] border border-[#9a4f43]/15 bg-[#f7e4df] px-4 py-3 text-[12px] text-[#8c493f]"
        >
          {editor.message}
        </p>
      ) : null}
      <VehicleLocalTabs
        vehicleId={vehicle.id}
        tab={initialTab}
        tabs={localTabs}
      />

      {initialTab === "overview" ? (
        <VehicleOverviewView
          vehicle={vehicle}
          mileage={mileage}
          primaryPhoto={primaryPhoto}
          onEdit={editor.openVehicleEditor}
          onMileage={() => editor.setDialog("mileage")}
          onNote={() => openNote("general")}
        />
      ) : null}
      {initialTab === "servicing" ? (
        <VehicleServicingView
          vehicle={vehicle}
          mileage={mileage}
          onAddService={() => openService("service")}
          onUpdateService={() => openService("service", true)}
          onReminder={() => editor.setDialog("reminder")}
        />
      ) : null}
      {initialTab === "repairs" ? (
        <VehicleRepairsView
          vehicle={vehicle}
          onAddRepair={() => openService("repair")}
        />
      ) : null}
      {initialTab === "costs" ? (
        <VehicleCostsPanel
          vehicle={vehicle}
          view={initialCostsView}
          onAddExpense={editor.openNewExpense}
          onEditExpense={editor.openExpenseEditor}
        />
      ) : null}
      {initialTab === "documents" ? (
        <VehicleDocumentsView
          vehicleId={vehicle.id}
          documents={regularDocuments}
          unlinkedDocuments={unlinkedGarageDocuments}
          onLink={linkDocument}
        />
      ) : null}
      {initialTab === "notes" ? (
        <VehicleNotesView
          vehicle={vehicle}
          photos={photoDocuments}
          uploadingPhoto={integrations.uploadingPhoto}
          onPhoto={integrations.addPhoto}
          onGeneralNote={() => openNote("general")}
          onEmergencyNote={() => openNote("emergency")}
        />
      ) : null}

      <p className="rounded-[18px] border border-[#20352a]/[0.07] bg-[#f0f2e9] px-4 py-3.5 text-[12px] leading-5 text-[#667068]">
        DiaryDock helps you organise vehicle information and reminders. Always
        confirm official MOT, tax, insurance and legal details with the relevant
        provider or authority.
      </p>
      <VehicleProfileDialogs
        dialog={editor.dialog}
        title={vehicleName}
        message={editor.message}
        close={editor.closeAndResetDialog}
        vehicleDraft={editor.vehicleDraft}
        setVehicleDraft={editor.setVehicleDraft}
        saveVehicle={editor.saveVehicle}
        mileageDraft={editor.mileageDraft}
        setMileageDraft={editor.setMileageDraft}
        saveMileage={editor.saveMileage}
        serviceDraft={editor.serviceDraft}
        setServiceDraft={editor.setServiceDraft}
        saveService={editor.saveService}
        expenseDraft={editor.expenseDraft}
        setExpenseDraft={editor.setExpenseDraft}
        saveExpense={editor.saveExpense}
        editingExpenseId={editor.editingExpenseId}
        deleteExpense={editor.deleteExpense}
        expenseDocuments={regularDocuments}
        vehicleServices={vehicle.services}
        noteDraft={editor.noteDraft}
        setNoteDraft={editor.setNoteDraft}
        saveNote={editor.saveNote}
        reminderDraft={integrations.reminderDraft}
        setReminderDraft={integrations.setReminderDraft}
        saveReminder={integrations.saveReminder}
      />
    </div>
  );
}
