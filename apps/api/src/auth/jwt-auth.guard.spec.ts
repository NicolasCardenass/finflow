import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const jwt = new JwtService({ secret: "unit-test-secret-with-enough-length-0000" });

function context(authorization?: string, isPublic = false) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const reflector = { getAllAndOverride: () => isPublic } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { guard: new JwtAuthGuard(jwt, reflector), ctx, request };
}

describe("JwtAuthGuard", () => {
  it("lets public routes through without a token", async () => {
    const { guard, ctx } = context(undefined, true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it("attaches the user from a valid bearer token", async () => {
    const token = await jwt.signAsync({ sub: "user-1", email: "a@b.co" });
    const { guard, ctx, request } = context(`Bearer ${token}`);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "a@b.co" });
  });

  it.each([
    [undefined, "Missing access token"],
    ["Basic abc", "Missing access token"],
    ["Bearer not-a-jwt", "Invalid or expired"],
  ])("rejects %s", async (header, message) => {
    const { guard, ctx } = context(header);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(message);
  });

  it("rejects tokens signed with another secret or expired", async () => {
    const forged = await new JwtService({
      secret: "another-secret-with-enough-length-0000",
    }).signAsync({ sub: "x", email: "x@y.z" });
    const expired = await jwt.signAsync({ sub: "x", email: "x@y.z" }, { expiresIn: -10 });

    for (const token of [forged, expired]) {
      const { guard, ctx } = context(`Bearer ${token}`);
      await expect(guard.canActivate(ctx)).rejects.toThrow("Invalid or expired");
    }
  });
});
