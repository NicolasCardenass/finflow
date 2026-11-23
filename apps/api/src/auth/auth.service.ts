import { createHash, randomBytes } from "node:crypto";
import type {
  AuthResponse,
  AuthTokens,
  LoginInput,
  PublicUser,
  RegisterInput,
} from "@finflow/shared";
import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Env } from "../config.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { refreshTokens, users, type User } from "../database/schema.js";

const BCRYPT_ROUNDS = 12;
// Compared against when the email does not exist, so both paths take similar time.
const DUMMY_HASH = bcrypt.hashSync("timing-attack-dummy-password", BCRYPT_ROUNDS);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const [user] = await this.db
      .insert(users)
      .values({ email: input.email, name: input.name, passwordHash })
      .onConflictDoNothing()
      .returning();
    if (!user) {
      throw new ConflictException("An account with this email already exists");
    }
    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, input.email));
    const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      // Same message for unknown email and wrong password: don't reveal which accounts exist.
      throw new UnauthorizedException("Invalid email or password");
    }
    return { user: toPublicUser(user), ...(await this.issueTokens(user)) };
  }

  /**
   * Exchange a refresh token for a new token pair (rotation). Each refresh
   * token works once; presenting an already used one means it was stolen
   * or replayed, so every session of that user is revoked.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));

    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    if (stored.revokedAt) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException("Refresh token reuse detected; please sign in again");
    }

    const [revoked] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.id, stored.id), isNull(refreshTokens.revokedAt)))
      .returning({ id: refreshTokens.id });
    if (!revoked) {
      // Lost a race with a concurrent refresh of the same token.
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, stored.userId));
    if (!user) throw new UnauthorizedException("Invalid or expired refresh token");
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.tokenHash, hashToken(refreshToken)), isNull(refreshTokens.revokedAt)),
      );
  }

  async me(userId: string): Promise<PublicUser> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new UnauthorizedException("User no longer exists");
    return toPublicUser(user);
  }

  private async revokeAll(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const expiresIn = this.config.get("ACCESS_TOKEN_TTL_SECONDS", { infer: true });
    const ttlDays = this.config.get("REFRESH_TOKEN_TTL_DAYS", { infer: true });

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn },
    );
    const refreshToken = randomBytes(32).toString("base64url");
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlDays * 86_400_000),
    });

    return { accessToken, refreshToken, expiresIn, tokenType: "Bearer" };
  }
}
