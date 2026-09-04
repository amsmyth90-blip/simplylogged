"use client";

import { VaultDocumentBrowser } from "@/components/vault-workspace/VaultDocumentBrowser";
import { VaultDocumentModal } from "@/components/vault-workspace/VaultDocumentModal";
import { VaultHeader } from "@/components/vault-workspace/VaultHeader";
import { useVaultController } from "@/components/vault-workspace/useVaultController";
import type { VaultFilter } from "@/components/vault-workspace/vault-workspace-model";
import type { VaultDocument } from "@/lib/mock-data";

type VaultWorkspaceProps = {
  initialDocuments: VaultDocument[];
  initialFilter?: VaultFilter;
};

export function VaultWorkspace({ initialFilter = "all" }: VaultWorkspaceProps) {
  const controller = useVaultController(initialFilter);
  return (
    <>
      <div className="immersive-page">
        <VaultHeader controller={controller} />
        {controller.fileMessage ? (
          <p role="status" className="estate-sheet border border-moss/15 bg-sage/45 px-4 py-3 text-xs font-medium text-ink/65">
            {controller.fileMessage}
          </p>
        ) : null}
        <VaultDocumentBrowser controller={controller} />
      </div>
      <VaultDocumentModal controller={controller} />
    </>
  );
}
