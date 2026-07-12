import { plainToInstance } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from "class-validator";

class EnvironmentVariables {
  @IsIn(["development", "test", "production"])
  NODE_ENV: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_EXPIRATION: number;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsInt()
  @Min(1)
  JWT_REFRESH_EXPIRATION_DAYS: number;

  @IsInt()
  @Min(4)
  BCRYPT_SALT_ROUNDS: number;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsInt()
  @Min(1)
  REDIS_CACHE_TTL: number;
}

export function validate(config: Record<string, unknown>) {
  const toValidate = {
    ...config,
    PORT: parseInt(config.PORT as string, 10),
    DB_PORT: parseInt(config.DB_PORT as string, 10),
    JWT_ACCESS_EXPIRATION: parseInt(config.JWT_ACCESS_EXPIRATION as string, 10),
    JWT_REFRESH_EXPIRATION_DAYS: parseInt(
      config.JWT_REFRESH_EXPIRATION_DAYS as string,
      10,
    ),
    BCRYPT_SALT_ROUNDS: parseInt(config.BCRYPT_SALT_ROUNDS as string, 10),
    REDIS_CACHE_TTL: parseInt(config.REDIS_CACHE_TTL as string, 10),
  };

  const validatedConfig = plainToInstance(EnvironmentVariables, toValidate, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join("; ")}`,
      )
      .join(" | ");
    throw new Error(`Thiếu/sai biến môi trường bắt buộc -> ${details}`);
  }

  return validatedConfig;
}
