import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type AuthResponse,
  type AuthTokens,
  type LoginInput,
  type PublicUser,
  type RefreshInput,
  type RegisterInput,
} from "@finflow/shared";
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser, type AuthUser } from "./current-user.decorator.js";
import { Public } from "./public.decorator.js";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiZodBody } from "../common/openapi.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Create an account and receive tokens", security: [] })
  @ApiZodBody(registerSchema)
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Sign in with email and password", security: [] })
  @ApiZodBody(loginSchema)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange a refresh token for a new token pair", security: [] })
  @ApiZodBody(refreshSchema)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Revoke a refresh token", security: [] })
  @ApiZodBody(refreshSchema)
  logout(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }

  @Get("me")
  @ApiOperation({ summary: "Current user" })
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.auth.me(user.id);
  }
}
