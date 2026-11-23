import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator.js";

export type HealthResponse = {
  status: "ok";
  version: string;
  uptimeSeconds: number;
};

export const API_VERSION = "0.1.0";

@Public()
@Controller("health")
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: "ok", version: API_VERSION, uptimeSeconds: Math.round(process.uptime()) };
  }
}
