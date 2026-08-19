import OpenAI from "openai";

export type VisionJsonSchema = {
  type: "object";
  additionalProperties?: boolean;
  properties: Record<string, unknown>;
  required?: readonly string[];
};

export type VisionJsonPage = {
  imageUrl: string;
  detail?: "low" | "high" | "auto";
};

export async function createVisionJsonResponse<T>(input: {
  apiKey: string;
  model: string;
  prompt: string;
  pages: VisionJsonPage[];
  schemaName: string;
  schema: VisionJsonSchema;
}) {
  const client = new OpenAI({ apiKey: input.apiKey });
  const response = await client.responses.create({
    model: input.model,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: input.prompt
          },
          ...input.pages.map((page) => ({
            type: "input_image" as const,
            image_url: page.imageUrl,
            detail: page.detail ?? "high"
          }))
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: input.schemaName,
        schema: input.schema,
        strict: true
      }
    }
  });

  if (!response.output_text) {
    throw new Error("The AI provider did not return extractable text.");
  }

  return JSON.parse(response.output_text) as T;
}

