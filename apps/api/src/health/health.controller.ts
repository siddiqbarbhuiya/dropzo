import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ApiHealthResponse } from '@dropzo/shared-types';

@ApiTags('health')
@Controller('health')
export class HealthController {
    @Get()
    @ApiOkResponse({ description: 'Service is reachable and running.' })
    check(): ApiHealthResponse {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
        };
    }
}
