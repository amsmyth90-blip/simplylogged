export const EMERGENCY_ACCESS_SCHEMA_VERSION = 1;

export type EmergencyResourceType = "CONTACT" | "DOCUMENT" | "HOME_INFO" | "INSTRUCTION";
export type TrustedContactStatus = "ACTIVE" | "EXPIRED" | "PENDING" | "REVOKED";

export type EmergencyAccessGrant = {
  id: string;
  resourceType: EmergencyResourceType;
  resourceId: string;
  label: string;
  grantedAt: string;
  revokedAt: string | null;
};

export type TrustedEmergencyContact = {
  id: string;
  name: string;
  email: string;
  relation: string;
  status: TrustedContactStatus;
  expiresAt: string;
  acceptedAt: string | null;
  grants: EmergencyAccessGrant[];
};

export type EmergencyAccessResource = {
  type: EmergencyResourceType;
  id: string;
  label: string;
  detail: string;
};

export type EmergencyAccessNotice = {
  id: string;
  eventType: "ACCESS_GRANTED" | "ACCESS_REVOKED" | "CONTACT_REVOKED" | "INVITATION_ACCEPTED";
  label: string;
  createdAt: string;
};

export type ReceivedEmergencyGrant = {
  id: string;
  resourceType: EmergencyResourceType;
  label: string;
  snapshot: Record<string, unknown>;
  grantedAt: string;
  contactName: string;
  contactRelation: string;
};

export type EmergencyAccessDirectory = {
  schemaVersion: typeof EMERGENCY_ACCESS_SCHEMA_VERSION;
  contacts: TrustedEmergencyContact[];
  resources: EmergencyAccessResource[];
  received: ReceivedEmergencyGrant[];
  notifications: EmergencyAccessNotice[];
};

export type EmergencyAccessMutation =
  | { operation: "CREATE_CONTACT"; name: string; email: string; relation: string }
  | { operation: "REVOKE_CONTACT"; contactId: string }
  | { operation: "SET_GRANT"; contactId: string; resourceType: EmergencyResourceType; resourceId: string; granted: boolean };
