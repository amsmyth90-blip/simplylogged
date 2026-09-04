import { useMemo } from "react";

import type {
  OfficeBillsSnapshot,
  OfficeContractsSnapshot,
  OfficeCorrespondenceSnapshot,
  OfficeInsuranceSnapshot,
} from "@diarydock/office";

import { OfficeScreen } from "@mobile/office/OfficeScreen";
import { PreviewStore } from "@mobile/preview/MobilePreview";
import { officeContactsPreview } from "./office-contact-preview";

const snapshot: OfficeBillsSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-02T09:00:00.000Z",
  bills: [
    {
      contentComplete: true,
      id: "electricity-bill",
      documentId: "electricity-document",
      title: "Electricity",
      provider: "Octopus Energy",
      category: "Utilities",
      accountNumberMasked: "•••• 4821",
      amount: 118.4,
      dueDate: "2026-09-14",
      frequency: "monthly",
      paymentMethod: "Direct debit",
      directDebit: true,
      status: "active",
      reviewStatus: "reviewed",
      billingPeriodStart: "2026-08-01",
      billingPeriodEnd: "2026-08-31",
      contractEndDate: "2027-02-28",
      noticePeriodDays: 30,
      usage: "342 kWh",
      notes: "Fixed tariff. Submit a meter reading before the next statement.",
      history: [],
      updatedAt: "2026-09-01T08:30:00.000Z",
    },
    {
      contentComplete: true,
      id: "broadband-bill",
      documentId: "broadband-document",
      title: "Home broadband",
      provider: "BT",
      category: "Communications",
      accountNumberMasked: "•••• 7710",
      amount: 42.99,
      dueDate: "2026-09-20",
      frequency: "monthly",
      paymentMethod: "Direct debit",
      directDebit: true,
      status: "active",
      reviewStatus: "needs-review",
      billingPeriodStart: "2026-09-01",
      billingPeriodEnd: "2026-09-30",
      contractEndDate: "2026-11-22",
      noticePeriodDays: 30,
      usage: "",
      notes: "Review the renewal price before the contract ends.",
      history: [],
      updatedAt: "2026-08-30T11:00:00.000Z",
    },
    {
      contentComplete: true,
      id: "council-tax-bill",
      documentId: null,
      title: "Council tax",
      provider: "Local council",
      category: "Council tax",
      accountNumberMasked: "•••• 1934",
      amount: 214,
      dueDate: "2026-09-01",
      frequency: "monthly",
      paymentMethod: "Bank transfer",
      directDebit: false,
      status: "overdue",
      reviewStatus: "needs-review",
      billingPeriodStart: "2026-09-01",
      billingPeriodEnd: "2026-09-30",
      contractEndDate: "",
      noticePeriodDays: null,
      usage: "",
      notes: "Confirm that this month's payment has cleared.",
      history: [],
      updatedAt: "2026-09-02T07:45:00.000Z",
    },
  ],
};

const insuranceSnapshot: OfficeInsuranceSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-02T09:00:00.000Z",
  policies: [
    {
      contentComplete: true,
      id: "home-policy",
      documentId: "home-policy-document",
      title: "Home insurance",
      type: "Home",
      provider: "Aviva",
      policyNumberMasked: "•••• 6402",
      status: "active",
      reviewStatus: "reviewed",
      startDate: "2026-01-18",
      renewalDate: "2027-01-18",
      premium: 486,
      premiumFrequency: "annual",
      autoRenew: true,
      coverSummary: "Buildings and contents cover for the family home.",
      coverItems: [
        { id: "buildings", label: "Buildings cover", value: "Included", included: true },
        { id: "accidental", label: "Accidental damage", value: "Not included", included: false },
      ],
      excess: 250,
      providerPhone: "0800 000 0000",
      providerEmail: "",
      linkedPeople: [],
      linkedAsset: "Family home",
      beneficiaries: "",
      notes: "Review the rebuild estimate before renewal.",
      history: [],
      createdAt: "2026-01-18T09:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    },
    {
      contentComplete: true,
      id: "life-policy",
      documentId: "life-policy-document",
      title: "Family life cover",
      type: "Life",
      provider: "Legal & General",
      policyNumberMasked: "•••• 1189",
      status: "active",
      reviewStatus: "needs-review",
      startDate: "2024-06-01",
      renewalDate: "2027-06-01",
      premium: 36.5,
      premiumFrequency: "monthly",
      autoRenew: false,
      coverSummary: "Level-term life cover.",
      coverItems: [],
      excess: 0,
      providerPhone: "",
      providerEmail: "",
      linkedPeople: ["Alex Morgan"],
      linkedAsset: "",
      beneficiaries: "Family trust note needs review",
      notes: "Confirm the beneficiary information against the trust documents.",
      history: [],
      createdAt: "2024-06-01T09:00:00.000Z",
      updatedAt: "2026-09-01T15:00:00.000Z",
    },
  ],
  claims: [
    {
      contentComplete: true,
      id: "storm-claim",
      policyId: "home-policy",
      title: "Storm damage to shed roof",
      claimNumberMasked: "•••• 7301",
      incidentDate: "2026-08-24",
      status: "assessing",
      description: "Photographs and repair estimate supplied to the insurer.",
      evidenceDocumentIds: ["storm-photo", "repair-estimate"],
      createdAt: "2026-08-25T08:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    },
  ],
};

const contractsSnapshot: OfficeContractsSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-02T09:00:00.000Z",
  contracts: [
    {
      contentComplete: true,
      id: "broadband-contract", documentId: "broadband-document",
      serviceName: "Home broadband", provider: "BT", category: "Broadband",
      status: "active", reviewStatus: "reviewed", accountEmail: "home@example.test",
      accountNumberMasked: "•••• 7710", cost: 42.99, frequency: "monthly",
      paymentMethod: "Direct Debit", startDate: "2025-11-22",
      minimumTermEnd: "2026-11-22", renewalDate: "2026-11-22",
      noticePeriodDays: 30, autoRenew: true, promotionalPrice: 34.99,
      promotionalEndDate: "2026-10-22", cancellationInstructions: "Contact the provider directly.",
      notes: "Review the renewal price before the minimum term ends.", priceHistory: [],
      lastReviewedAt: "2026-08-30T11:00:00.000Z", updatedAt: "2026-08-30T11:00:00.000Z",
    },
    {
      contentComplete: true,
      id: "streaming-contract", documentId: null, serviceName: "Family streaming",
      provider: "Netflix", category: "Streaming", status: "active",
      reviewStatus: "needs-review", accountEmail: "", accountNumberMasked: "",
      cost: 17.99, frequency: "monthly", paymentMethod: "Payment card",
      startDate: "2024-04-01", minimumTermEnd: "", renewalDate: "2026-10-01",
      noticePeriodDays: 0, autoRenew: true, promotionalPrice: null,
      promotionalEndDate: "", cancellationInstructions: "Cancel through the provider account.",
      notes: "Confirm the current plan is still needed.", priceHistory: [],
      lastReviewedAt: "", updatedAt: "2026-09-01T09:00:00.000Z",
    },
  ],
};

const correspondenceSnapshot: OfficeCorrespondenceSnapshot = {
  schemaVersion: 1,
  revision: "2026-09-02T09:00:00.000Z",
  correspondence: [
    {
      contentComplete: true,
      id: "council-letter", documentId: "council-tax-document",
      title: "Council tax balance notice", sender: "Local council",
      correspondenceType: "Letter", folder: "Government & HMRC",
      receivedDate: "2026-09-01", deadline: "2026-09-16",
      status: "action-needed", reviewStatus: "reviewed",
      summary: "Check the outstanding balance and reply before the stated deadline.",
      actions: [{ id: "check-balance", label: "Check the balance against bank records", completed: false }],
      contactName: "Council tax team", contactPhone: "020 0000 0000",
      contactUrl: "https://example.test/council-tax", linkedReminderIds: [],
      linkedBillId: "council-tax-bill", linkedPolicyId: null,
      responses: [{ id: "call-note", note: "Called and requested an itemised statement.",
        createdAt: "2026-09-02T09:15:00.000Z" }], updatedAt: "2026-09-02T09:15:00.000Z",
    },
    {
      contentComplete: true,
      id: "insurance-letter", documentId: null, title: "Home policy renewal",
      sender: "Aviva", correspondenceType: "Renewal notice", folder: "Insurance",
      receivedDate: "2026-08-29", deadline: "2026-09-30", status: "unread",
      reviewStatus: "needs-review", summary: "Review the renewal premium and cover.",
      actions: [], contactName: "", contactPhone: "", contactUrl: "",
      linkedReminderIds: [], linkedBillId: null, linkedPolicyId: "home-policy",
      responses: [], updatedAt: "2026-08-29T10:00:00.000Z",
    },
  ],
};

export function OfficePreview() {
  const store = useMemo(() => new PreviewStore(), []);
  return (
    <OfficeScreen
      accessToken="preview-access-token-that-is-long-enough"
      disableOnline
      initialArea="contacts"
      initialContactsSnapshot={officeContactsPreview}
      initialContractsSnapshot={contractsSnapshot}
      initialCorrespondenceSnapshot={correspondenceSnapshot}
      initialInsuranceSnapshot={insuranceSnapshot}
      initialSnapshot={snapshot}
      store={store}
      syncStatus="READY"
      synchronize={async () => true}
      onBack={() => undefined}
      onNavigate={() => undefined}
      onOpenSafeRoom={() => undefined}
      onScan={() => undefined}
    />
  );
}
