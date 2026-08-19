import type { ActionRiskLevel, ActionType } from "@/lib/actions/types";
import type { LifeSensitivityTier } from "@/lib/life-graph/types";

export type PermissionScope = "read" | "write" | "act" | "share";

export type PermissionDecision = {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
};

const highRiskActions: ActionType[] = ["share_document", "draft_email", "contact_provider"];
const veryHighRiskActions: ActionType[] = ["cancel_subscription", "make_purchase", "submit_form"];

export function riskForAction(actionType: ActionType): ActionRiskLevel {
  if (veryHighRiskActions.includes(actionType)) return "very_high";
  if (highRiskActions.includes(actionType)) return "high";
  if (actionType === "update_record" || actionType === "link_document") return "medium";
  return "low";
}

export function sensitivityRequiresConfirmation(sensitivity: LifeSensitivityTier) {
  return sensitivity === "sensitive" || sensitivity === "highly_sensitive";
}

export function defaultPermissionDecision(input: {
  actionType: ActionType;
  sensitivity?: LifeSensitivityTier;
  autopilotAllowed?: boolean;
}): PermissionDecision {
  const risk = riskForAction(input.actionType);
  const sensitive = input.sensitivity ? sensitivityRequiresConfirmation(input.sensitivity) : false;

  if (risk === "very_high") {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "Very high risk actions must always be handled manually."
    };
  }

  if (risk === "high") {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: "High risk actions need explicit confirmation before DiaryDock acts."
    };
  }

  if (sensitive) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: "Sensitive records need confirmation before changes are made."
    };
  }

  if (risk === "medium") {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: "Record updates should be reviewed before saving."
    };
  }

  return {
    allowed: true,
    requiresConfirmation: !input.autopilotAllowed,
    reason: input.autopilotAllowed
      ? "Low risk action is allowed by the current autopilot setting."
      : "Low risk action is safe, but confirmation is required until autopilot is enabled."
  };
}

