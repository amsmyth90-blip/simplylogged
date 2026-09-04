export type EmergencyGrant = {
  id: string;
  resource_type: string;
  resource_id: string;
  label: string;
  granted_at: string;
  revoked_at: string | null;
};

export type EmergencyContact = {
  id: string;
  name: string;
  email: string;
  relation: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  emergency_access_grants: EmergencyGrant[];
};

export type EmergencyResource = {
  type: "DOCUMENT" | "INSTRUCTION" | "CONTACT" | "HOME_INFO";
  id: string;
  label: string;
  detail: string;
};

export type AccessNotice = {
  id: string;
  event_type: string;
  label: string;
  created_at: string;
};

export type AccessPayload = {
  contacts?: EmergencyContact[];
  resources?: EmergencyResource[];
  notifications?: AccessNotice[];
  error?: string;
};
