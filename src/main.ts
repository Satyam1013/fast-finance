import { webcrypto } from "node:crypto";
(globalThis as Record<string, unknown>).crypto ??= webcrypto;

import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // OpenAPI — this is the contract the mobile + web-panel teams build against.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Fast Finance API")
    .setDescription("Loan & investment origination platform — internal API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/v1/docs", app, doc, {
    jsonDocumentUrl: "api/v1/docs-json",
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  Logger.log(
    `Fast Finance API on http://localhost:${port}/api/v1  (docs: /api/v1/docs)`,
    "Bootstrap",
  );
}

void bootstrap();
