import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { MerchantAccessGuard } from './merchant-access.guard.js';
import type { AuthenticatedRequest } from '../auth.types.js';

function makeContext(userId: string, params: Record<string, string>) {
    const request = {
        user: { id: userId, roles: ['MERCHANT_OWNER'], sessionId: 's1' },
        params,
    } as unknown as AuthenticatedRequest;
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
}

describe('MerchantAccessGuard', () => {
    it('allows the merchant owner through for their own merchant', async () => {
        const prisma = {
            merchant: {
                findUnique: jest.fn(async () => ({ id: 'merchant-1', owner_user_id: 'owner-1' })),
            },
            merchantStaff: { findFirst: jest.fn(async () => null) },
            store: { findUnique: jest.fn(async () => null) },
        } as never;
        const guard = new MerchantAccessGuard(prisma);

        await expect(
            guard.canActivate(makeContext('owner-1', { merchantId: 'merchant-1' })),
        ).resolves.toBe(true);
    });

    it('allows staff listed in merchant_staff through', async () => {
        const prisma = {
            merchant: {
                findUnique: jest.fn(async () => ({ id: 'merchant-1', owner_user_id: 'owner-1' })),
            },
            merchantStaff: {
                findFirst: jest.fn(async () => ({ merchant_id: 'merchant-1', user_id: 'staff-1' })),
            },
            store: { findUnique: jest.fn(async () => null) },
        } as never;
        const guard = new MerchantAccessGuard(prisma);

        await expect(
            guard.canActivate(makeContext('staff-1', { merchantId: 'merchant-1' })),
        ).resolves.toBe(true);
    });

    it('denies a user with no ownership or staff membership (cross-tenant access)', async () => {
        const prisma = {
            merchant: {
                findUnique: jest.fn(async () => ({ id: 'merchant-1', owner_user_id: 'owner-1' })),
            },
            merchantStaff: { findFirst: jest.fn(async () => null) },
            store: { findUnique: jest.fn(async () => null) },
        } as never;
        const guard = new MerchantAccessGuard(prisma);

        await expect(
            guard.canActivate(makeContext('intruder-1', { merchantId: 'merchant-1' })),
        ).rejects.toThrow(ForbiddenException);
    });

    it('resolves a :storeId param to its owning merchant before checking access', async () => {
        const prisma = {
            merchant: {
                findUnique: jest.fn(async () => ({ id: 'merchant-1', owner_user_id: 'owner-1' })),
            },
            merchantStaff: { findFirst: jest.fn(async () => null) },
            store: {
                findUnique: jest.fn(async () => ({ id: 'store-1', merchant_id: 'merchant-1' })),
            },
        } as never;
        const guard = new MerchantAccessGuard(prisma);

        await expect(
            guard.canActivate(makeContext('owner-1', { storeId: 'store-1' })),
        ).resolves.toBe(true);
    });

    it('denies when neither :merchantId nor :storeId is present on the request', async () => {
        const prisma = {
            merchant: { findUnique: jest.fn(async () => null) },
            merchantStaff: { findFirst: jest.fn(async () => null) },
            store: { findUnique: jest.fn(async () => null) },
        } as never;
        const guard = new MerchantAccessGuard(prisma);

        await expect(guard.canActivate(makeContext('owner-1', {}))).rejects.toThrow(
            ForbiddenException,
        );
    });
});
