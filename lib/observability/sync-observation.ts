import "server-only";

import { RequestObservation } from "./request-observation";

type SyncOperation = "pull" | "push";

export class SyncObservation extends RequestObservation {
  constructor(operation: SyncOperation, request?: Request) {
    super({ operation, request, route: `/api/sync/${operation}` });
  }
}
