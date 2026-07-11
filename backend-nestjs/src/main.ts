process.env.TZ = "UTC";

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { validationExceptionFactory } from "./common/validation/validation-exception-factory";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Store Management API - NestJS")
    .setDescription(
      "API quan ly cua hang tien loi mini. Tai khoan seed san de test: " +
        "admin@store.local / Admin@123 (role admin), staff@store.local / Staff@123 (role staff).",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port);
  console.log(`backend-nestjs is running on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}

bootstrap();
