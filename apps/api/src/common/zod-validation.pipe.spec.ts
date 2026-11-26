import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(
    z.object({ name: z.string().trim().min(1), age: z.coerce.number().int().min(0) }),
  );

  it("returns the parsed and transformed value", () => {
    expect(pipe.transform({ name: "  Ana ", age: "30" })).toEqual({ name: "Ana", age: 30 });
  });

  it("throws a 400 listing every invalid field", () => {
    try {
      pipe.transform({ name: " ", age: "-1" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: { path: string }[];
      };
      expect(response.message).toBe("Validation failed");
      expect(response.errors.map((e) => e.path).sort()).toEqual(["age", "name"]);
    }
  });
});
