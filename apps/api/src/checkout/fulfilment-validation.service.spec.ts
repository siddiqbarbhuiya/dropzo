import { jest } from '@jest/globals';
import { FulfilmentValidationService } from './fulfilment-validation.service.js';

const deliveryAddress = {
    recipientName: 'Priya Devi',
    recipientPhone: '9876543210',
    addressLine1: 'House 12',
    city: 'Badarpur',
    district: 'Karimganj',
    latitude: 24.86,
    longitude: 92.51,
};

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        store: {
            findUniqueOrThrow: jest.fn(async () => ({
                id: 'store-1',
                supports_pickup: true,
                supports_delivery: true,
                service_zone_id: 'zone-1',
                location: {},
                ...((overrides.store as object) ?? {}),
            })),
        },
        serviceZone: {
            findUnique: jest.fn(async () => ({
                id: 'zone-1',
                is_active: true,
                max_delivery_radius_km: 5,
                ...((overrides.serviceZone as object) ?? {}),
            })),
        },
        $queryRaw: (overrides.$queryRaw as unknown) ?? jest.fn(async () => [{ within: true }]),
    } as never;
}

describe('FulfilmentValidationService', () => {
    it('allows pickup when the store supports it', async () => {
        const prisma = makePrisma();
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'PICKUP', undefined);
        expect(errors).toEqual([]);
    });

    it('rejects pickup when the store does not support it', async () => {
        const prisma = makePrisma({ store: { supports_pickup: false } });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'PICKUP', undefined);
        expect(errors).toEqual(['PICKUP_NOT_SUPPORTED']);
    });

    it('allows delivery within the configured radius', async () => {
        const prisma = makePrisma();
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toEqual([]);
    });

    it('requires a delivery address when fulfilmentType is DELIVERY', async () => {
        const prisma = makePrisma();
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', undefined);
        expect(errors).toContain('DELIVERY_ADDRESS_REQUIRED');
    });

    it('rejects delivery when the store does not support it', async () => {
        const prisma = makePrisma({ store: { supports_delivery: false } });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toContain('DELIVERY_NOT_SUPPORTED');
    });

    it('rejects delivery when the service zone is inactive', async () => {
        const prisma = makePrisma({ serviceZone: { is_active: false } });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toEqual(['DELIVERY_ZONE_INACTIVE']);
    });

    it('rejects delivery when the store has no configured zone', async () => {
        const prisma = makePrisma({ store: { service_zone_id: null } });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toEqual(['DELIVERY_ZONE_NOT_CONFIGURED']);
    });

    it('rejects delivery when the address is outside the configured radius', async () => {
        const prisma = makePrisma({ $queryRaw: jest.fn(async () => [{ within: false }]) });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toEqual(['DELIVERY_OUT_OF_RANGE']);
    });

    it('rejects delivery when the zone has no configured radius (no basis to call it deliverable)', async () => {
        const prisma = makePrisma({ serviceZone: { max_delivery_radius_km: null } });
        const service = new FulfilmentValidationService(prisma);
        const errors = await service.validate('store-1', 'DELIVERY', deliveryAddress);
        expect(errors).toEqual(['DELIVERY_OUT_OF_RANGE']);
    });
});
