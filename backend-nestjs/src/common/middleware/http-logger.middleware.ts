import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { appendFile } from "fs/promises";
import { join } from "path";

const LOG_FILE = join(process.cwd(), "app.log");

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

      const entry = {
        level:
          res.statusCode >= 500
            ? "error"
            : res.statusCode >= 400
              ? "warn"
              : "info",
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        userAgent: req.headers["user-agent"] ?? null,
        ip: req.ip,
      };

      const line = JSON.stringify(entry);
      this.logger.log(line);

      appendFile(LOG_FILE, line + "\n").catch((err) => {
        this.logger.error(`Không ghi được app.log: ${(err as Error).message}`);
      });
    });

    next();
  }
}
