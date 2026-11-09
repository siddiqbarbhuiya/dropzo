import { Injectable } from '@nestjs/common';
import type { Prisma, Store } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DeliveryAddressDto } from './dto/delivery-address.dto.js';
import type { FulfilmentErrorCode } from './checkout.types.js';

type DbClient = PrismaService | Prisma.TransactionClient;

/**
 * Pickup/delivery eligibility, per docs/04-design/DATABASE-DESIGN.md's "Service zones and delivery
 * eligibility": deliverable iff the store's service_zones membership is active AND the address
 * falls within `max_delivery_radius_km` of the store (`ST_DWithin`) - radius-based checking is the
 * documented MVP approach; polygon (`boundary`) containment is an explicitly optional upgrade, not
 * implemented here. No delivery-partner assignment or route optimization - out of BC-008's scope.
 */
@Injectable()
export class FulfilmentValidationService {
    constructor(private readonly prisma: PrismaService) {}

    async validate(
        storeId: string,
        fulfilmentType: 'PICKUP' | 'DELIVERY',
        deliveryAddress: DeliveryAddressDto | undefined,
        client: DbClient = this.prisma,
    ): Promise<FulfilmentErrorCode[]> {
        const store = await client.store.findUniqueOrThrow({ where: { id: storeId } });

        if (fulfilmentType === 'PICKUP') {
            return store.supports_pickup ? [] : ['PICKUP_NOT_SUPPORTED'];
        }

        const errors: FulfilmentErrorCode[] = [];
        if (!store.supports_delivery) {
            errors.push('DELIVERY_NOT_SUPPORTED');
        }
        if (!deliveryAddress) {
            errors.push('DELIVERY_ADDRESS_REQUIRED');
            return errors;
        }
        if (errors.length > 0) {
            return errors;
        }

        const zoneError = await this.checkZoneEligibility(store, deliveryAddress, client);
        if (zoneError) errors.push(zoneError);
        return errors;
    }

    private async checkZoneEligibility(
        store: Store,
        address: DeliveryAddressDto,
        client: DbClient,
    ): Promise<FulfilmentErrorCode | null> {
        if (!store.service_zone_id) {
            return 'DELIVERY_ZONE_NOT_CONFIGURED';
        }
        const zone = await client.serviceZone.findUnique({ where: { id: store.service_zone_id } });
        if (!zone || !zone.is_active) {
            return 'DELIVERY_ZONE_INACTIVE';
        }
        if (zone.max_delivery_radius_km === null) {
            // No radius configured and no boundary-polygon upgrade in use - there is no basis to
            // call this address deliverable, so it is treated as out of range rather than silently
            // allowing unlimited distance.
            return 'DELIVERY_OUT_OF_RANGE';
        }

        const rows = await client.$queryRaw<Array<{ within: boolean }>>`
            SELECT ST_DWithin(
                s.location,
                ST_SetSRID(ST_MakePoint(${address.longitude}, ${address.latitude}), 4326)::geography,
                ${Number(zone.max_delivery_radius_km)} * 1000
            ) AS within
            FROM "stores" s
            WHERE s.id = ${store.id}::uuid
        `;
        return rows[0]?.within ? null : 'DELIVERY_OUT_OF_RANGE';
    }
}
