import { z } from "zod";
import { zodToOpenApi } from "./openapi.js";

describe("zodToOpenApi", () => {
  it("describes the request input, including defaults and formats", () => {
    const schema = z.object({
      id: z.uuid(),
      page: z.coerce.number().int().default(1),
      note: z.string().nullable(),
    });

    expect(zodToOpenApi(schema)).toEqual({
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        page: {
          type: "integer",
          default: 1,
          minimum: expect.any(Number),
          maximum: expect.any(Number),
        },
        note: { type: ["string", "null"] },
      },
      required: ["id", "note"],
    });
  });
});
