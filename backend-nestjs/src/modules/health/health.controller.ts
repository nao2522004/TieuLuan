import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Kiểm tra server còn sống không" })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: { status: "ok", service: "backend-nestjs" },
        timestamp: "2026-07-11T10:00:00.000Z",
      },
    },
  })
  check() {
    return {
      status: "ok",
      service: "backend-nestjs",
    };
  }
}
