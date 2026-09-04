import "server-only";

import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";

import { emitServerEvent } from "./safe-event";

type RequestResult = {
  outcome: string;
  records?: number;
  status: number;
};

type RequestObservationInput = {
  operation: string;
  request?: Request;
  route: string;
};

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{15,63}$/;
const meter = metrics.getMeter("diarydock-web");
const duration = meter.createHistogram("diarydock.request.duration", { unit: "ms" });
const requests = meter.createCounter("diarydock.request.count");

function sampleRate() {
  const configured = Number(process.env.DIARYDOCK_OBSERVABILITY_SAMPLE_RATE ?? "0.01");
  return Number.isFinite(configured) ? Math.min(1, Math.max(0, configured)) : 0.01;
}

function requestId(request?: Request) {
  const candidate = request?.headers.get("x-request-id")?.trim() ?? "";
  return requestIdPattern.test(candidate) ? candidate : crypto.randomUUID();
}

function statusClass(status: number) {
  return `${Math.floor(status / 100)}xx`;
}

export class RequestObservation {
  readonly requestId: string;
  private readonly operation: string;
  private readonly route: string;
  private readonly startedAt = performance.now();

  constructor(input: RequestObservationInput) {
    this.operation = input.operation;
    this.route = input.route;
    this.requestId = requestId(input.request);
  }

  finish(headers: Headers, result: RequestResult) {
    const durationMs = Math.max(0, performance.now() - this.startedAt);
    const metricAttributes = {
      "diarydock.operation": this.operation,
      "http.route": this.route,
      "http.status_class": statusClass(result.status),
      outcome: result.outcome,
    };
    headers.set("X-Request-Id", this.requestId);
    headers.set("Server-Timing", `app;dur=${durationMs.toFixed(1)}`);
    duration.record(durationMs, metricAttributes);
    requests.add(1, metricAttributes);

    const span = trace.getActiveSpan();
    span?.setAttributes({
      "diarydock.operation": this.operation,
      "diarydock.outcome": result.outcome,
      "diarydock.records": Math.max(0, Math.floor(result.records ?? 0)),
      "http.response.status_code": result.status,
    });
    if (result.status >= 500) span?.setStatus({ code: SpanStatusCode.ERROR });

    if (result.status < 400 && Math.random() >= sampleRate()) return;
    emitServerEvent(result.status >= 500 ? "error" : result.status >= 400 ? "warn" : "info", "app.request", {
      durationMs: Math.round(durationMs),
      operation: this.operation,
      outcome: result.outcome,
      records: Math.max(0, Math.floor(result.records ?? 0)),
      requestId: this.requestId,
      route: this.route,
      status: result.status,
    });
  }
}
