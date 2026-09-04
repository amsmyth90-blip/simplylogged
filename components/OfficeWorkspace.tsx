"use client";

import { OfficeAdminModal } from "@/components/office-workspace/OfficeAdminModal";
import { OfficeDocumentDashboard } from "@/components/office-workspace/OfficeDocumentDashboard";
import { OfficeInboxModal } from "@/components/office-workspace/OfficeInboxModal";
import { OfficeLanding } from "@/components/office-workspace/OfficeLanding";
import type { OfficeWorkspaceProps } from "@/components/office-workspace/office-workspace-model";
import { useOfficeController } from "@/components/office-workspace/useOfficeController";

export function OfficeWorkspace({ initialDrawer }: OfficeWorkspaceProps) {
  const controller = useOfficeController(initialDrawer);
  return (
    <>
      <OfficeLanding controller={controller} />
      <OfficeInboxModal controller={controller} />
      <OfficeAdminModal controller={controller} />
      <OfficeDocumentDashboard
        open={controller.panel === "documents"}
        drawer={controller.selectedDrawerConfig}
        documents={controller.selectedDrawerFiles}
        totalDocuments={controller.selectedDrawer ? controller.drawerFiles[controller.selectedDrawer].length : 0}
        query={controller.drawerQuery}
        onQueryChange={controller.setDrawerQuery}
        wishesRecord={controller.wishesDraft}
        onWishesChange={controller.setWishesDraft}
        onSaveWishes={controller.saveWishes}
        onClose={controller.closeDocumentDrawer}
      />
    </>
  );
}
