import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
    let controller: HealthController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
        }).compile();

        controller = module.get<HealthController>(HealthController);
    });

    it('reports status ok with a timestamp and uptime', () => {
        const result = controller.check();
        expect(result.status).toBe('ok');
        expect(typeof result.timestamp).toBe('string');
        expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
});
