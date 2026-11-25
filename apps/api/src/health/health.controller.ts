import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator.js";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

export type HealthResponse = {
  status: "ok";
  version: string;
  uptimeSeconds: number;
};

export const API_VERSION = "0.1.0";

@Public()
@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Liveness check", security: [] })
  check(): HealthResponse {
    return { status: "ok", version: API_VERSION, uptimeSeconds: Math.round(process.uptime()) };
  }
}
