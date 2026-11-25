import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { API_VERSION } from "./health/health.controller.js";

/** Interactive documentation at /api/docs and the raw OpenAPI document at /api/docs-json. */
export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setOpenAPIVersion("3.1.0")
    .setTitle("FinFlow API")
    .setDescription(
      "Personal finance API: accounts, categories, transactions, budgets and reports. " +
        "Amounts are integer cents. Sign in with POST /api/auth/login (demo: " +
        "demo@finflow.dev / demo1234) and use the access token with the Authorize button.",
    )
    .setVersion(API_VERSION)
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .addSecurityRequirements("bearer")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: { persistAuthorization: true },
  });
}
