import { applyDecorators } from "@nestjs/common";
import { ApiBody, ApiQuery } from "@nestjs/swagger";
import { z } from "zod";

type JsonSchema = Record<string, unknown>;

/** Drop regex patterns that only repeat a `format` (uuid, date…) to keep the docs readable. */
function simplify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplify);
  if (node && typeof node === "object") {
    const entries = Object.entries(node as JsonSchema)
      .filter(([key]) => key !== "$schema")
      .filter(([key], _, all) => !(key === "pattern" && all.some(([k]) => k === "format")))
      .map(([key, value]) => [key, simplify(value)]);
    return Object.fromEntries(entries);
  }
  return node;
}

/**
 * OpenAPI schema of what a client may *send* for a Zod schema, so the docs
 * are generated from the same definitions that validate requests.
 */
export function zodToOpenApi(schema: z.ZodType): JsonSchema {
  return simplify(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })) as JsonSchema;
}

/** Document a JSON request body validated by `schema`. */
export function ApiZodBody(schema: z.ZodType) {
  return ApiBody({ schema: zodToOpenApi(schema) });
}

/** Document each query-string parameter of an object schema. */
export function ApiZodQuery(schema: z.ZodType) {
  const json = zodToOpenApi(schema) as {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  const required = new Set(json.required ?? []);
  return applyDecorators(
    ...Object.entries(json.properties ?? {}).map(([name, property]) =>
      ApiQuery({ name, required: required.has(name), schema: property }),
    ),
  );
}
