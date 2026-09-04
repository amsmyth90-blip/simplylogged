import { createVisionJsonResponse, type VisionJsonSchema } from "@/lib/brain/provider-adapters/openai";

export type CaptureAnalysisInput = {
  model: string;
  prompt: string;
  pages: Array<{ imageUrl: string; detail: "high" }>;
  schemaName: string;
  schema: VisionJsonSchema;
};

export interface CaptureAnalysisProvider {
  readonly name: string;
  analyse<T>(input: CaptureAnalysisInput): Promise<T>;
}

class OpenAICaptureProvider implements CaptureAnalysisProvider {
  readonly name = "openai";

  constructor(private readonly apiKey: string) {}

  analyse<T>(input: CaptureAnalysisInput) {
    return createVisionJsonResponse<T>({ apiKey: this.apiKey, ...input });
  }
}

export function getCaptureAnalysisProvider(): CaptureAnalysisProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAICaptureProvider(apiKey) : null;
}
