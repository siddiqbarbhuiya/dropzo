// BC-006 merchant onboarding / store management integration suite. Same approach as
// auth.integration-spec.ts: a real Nest DI graph, real PostgreSQL, no mocked Prisma. Reuses that
// file's TestAuthAppModule pattern (minus @nestjs/throttler - see its own comment there for why)
// extended with MerchantModule, so real JWT sessions can be issued to exercise HTTP-level guard
// wiring, while the bulk of the business-logic coverage calls the real services directly.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Module, ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from '../../src/config/env.validation.js';
import { PrismaModule } from '../../src/prisma/prisma.module.js';
import { AuditModule } from '../../src/common/audit/audit.module.js';
import { OtpModule } from '../../src/auth/otp/otp.module.js';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter.js';
import { AuthService } from '../../src/auth/auth.service.js';
import { TokenService } from '../../src/auth/token.service.js';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../src/auth/guards/roles.guard.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { MerchantApplicationService } from '../../src/merchant/merchant-application.service.js';
import { MerchantApplicationController } from '../../src/merchant/merchant-application.controller.js';
import { StoreService } from '../../src/merchant/store.service.js';
import { StoreController } from '../../src/merchant/store.controller.js';
import {
    AdminMerchantsController,
    AdminStoresController,
} from '../../src/merchant/admin-merchant.controller.js';
import { disconnectAll, resetDatabase } from '../helpers/clients.js';
import type { UserRoleName } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootEnvPath = resolve(__dirname, '..', '..', '..', '..', '.env');

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: repoRootEnvPath,
            validate: validateEnv,
        }),
        PrismaModule,
        AuditModule,
        OtpModule,
        JwtModule.register({}),
    ],
    controllers: [
        MerchantApplicationController,
        StoreController,
        AdminMerchantsController,
        AdminStoresController,
    ],
    providers: [
        AuthService,
        TokenService,
        MerchantApplicationService,
        StoreService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
class TestMerchantAppModule {}

function freshPhone(): string {
    return `+919${randomUUID().replace(/\D/g, '').slice(0, 9).padEnd(9, '1')}`;
}

let app: INestApplication;
let prisma: PrismaService;
let merchantApplications: MerchantApplicationService;
let stores: StoreService;
let tokenService: TokenService;

beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
        imports: [TestMerchantAppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    merchantApplications = app.get(MerchantApplicationService);
    stores = app.get(StoreService);
    tokenService = app.get(TokenService);
});

afterAll(async () => {
    await app.close();
    await disconnectAll();
});

beforeEach(async () => {
    await resetDatabase();
});

async function makeUser(roles: UserRoleName[] = ['CUSTOMER']) {
    const user = await prisma.user.create({ data: { phone: freshPhone() } });
    for (const role of roles) {
        await prisma.userRole.create({ data: { user_id: user.id, role } });
    }
    return user;
}

async function tokenFor(userId: string, roles: string[]) {
    const { accessToken } = await tokenService.issueSession(userId, roles, {});
    return accessToken;
}

const applicationDto = {
    legalName: 'Barbhuiya General Store Pvt Ltd',
    displayName: 'Barbhuiya General Store',
    contactPhone: '9876543210',
    businessAddress: 'Main Road, Badarpur',
};

const storeDto = {
    name: 'Main Branch',
    address: 'Market Road',
    district: 'Karimganj',
    city: 'Badarpur',
    latitude: 24.86,
    longitude: 92.51,
};

async function approveMerchant(userId: string) {
    const application = await merchantApplications.submitApplication(userId, applicationDto);
    const admin = await makeUser(['ADMIN']);
    return merchantApplications.approve(application.id, admin.id);
}

describe('Merchant application lifecycle (service + real DB)', () => {
    it('submits a new application as PENDING', async () => {
        const user = await makeUser();
        const application = await merchantApplications.submitApplication(user.id, applicationDto);
        expect(application.verification_status).toBe('PENDING');
        expect(application.owner_user_id).toBe(user.id);
    });

    it('rejects a duplicate submission at the database level (owner_user_id is UNIQUE)', async () => {
        const user = await makeUser();
        await merchantApplications.submitApplication(user.id, applicationDto);
        await expect(
            merchantApplications.submitApplication(user.id, applicationDto),
        ).rejects.toThrow();
    });

    it('allows resubmission after rejection, reusing the same merchant row', async () => {
        const user = await makeUser();
        const application = await merchantApplications.submitApplication(user.id, applicationDto);
        const admin = await makeUser(['ADMIN']);
        await merchantApplications.reject(application.id, admin.id, 'incomplete address');

        const resubmitted = await merchantApplications.submitApplication(user.id, applicationDto);
        expect(resubmitted.id).toBe(application.id);
        expect(resubmitted.verification_status).toBe('PENDING');
        expect(resubmitted.rejection_reason).toBeNull();

        const rows = await prisma.merchant.findMany({ where: { owner_user_id: user.id } });
        expect(rows).toHaveLength(1);
    });

    it('never approves the same application twice under a concurrent admin race', async () => {
        const user = await makeUser();
        const application = await merchantApplications.submitApplication(user.id, applicationDto);
        const admin = await makeUser(['ADMIN']);

        const [a, b] = await Promise.allSettled([
            merchantApplications.approve(application.id, admin.id),
            merchantApplications.reject(application.id, admin.id, 'racing decision'),
        ]);
        const outcomes = [a.status, b.status].sort();
        expect(outcomes).toEqual(['fulfilled', 'rejected']);

        const final = await prisma.merchant.findUniqueOrThrow({ where: { id: application.id } });
        expect(['APPROVED', 'REJECTED']).toContain(final.verification_status);
    });

    it('grants MERCHANT_OWNER on approval, and the owner can then create a store', async () => {
        const user = await makeUser();
        await approveMerchant(user.id);

        const roles = await prisma.userRole.findMany({ where: { user_id: user.id } });
        expect(roles.map((r) => r.role)).toContain('MERCHANT_OWNER');

        const store = await stores.createStore(user.id, storeDto);
        expect(store.status).toBe('PENDING');
    });

    it('rejects store creation for an application that is not yet approved', async () => {
        const user = await makeUser();
        await merchantApplications.submitApplication(user.id, applicationDto);
        await expect(stores.createStore(user.id, storeDto)).rejects.toThrow();
    });

    it('rejects store creation for a suspended merchant', async () => {
        const user = await makeUser();
        const approved = await approveMerchant(user.id);
        const admin = await makeUser(['ADMIN']);
        await merchantApplications.suspend(approved.id, admin.id, 'policy violation');

        await expect(stores.createStore(user.id, storeDto)).rejects.toThrow();
    });

    it('reinstates a suspended merchant back to APPROVED', async () => {
        const user = await makeUser();
        const approved = await approveMerchant(user.id);
        const admin = await makeUser(['ADMIN']);
        await merchantApplications.suspend(approved.id, admin.id, 'policy violation');

        const reinstated = await merchantApplications.reinstate(approved.id, admin.id);
        expect(reinstated.verification_status).toBe('APPROVED');
        await expect(stores.createStore(user.id, storeDto)).resolves.toMatchObject({
            status: 'PENDING',
        });
    });
});

describe('Store management (service + real DB)', () => {
    it("never lets a merchant access another merchant's store", async () => {
        const ownerA = await makeUser();
        await approveMerchant(ownerA.id);
        const storeA = await stores.createStore(ownerA.id, storeDto);

        const ownerB = await makeUser();
        await approveMerchant(ownerB.id);

        await expect(stores.getOwnStore(ownerB.id, storeA.id)).rejects.toThrow();
        await expect(
            stores.updateStore(ownerB.id, storeA.id, { name: 'Hijacked' }),
        ).rejects.toThrow();
    });

    it("lists only the caller's own stores", async () => {
        const ownerA = await makeUser();
        await approveMerchant(ownerA.id);
        await stores.createStore(ownerA.id, storeDto);
        await stores.createStore(ownerA.id, { ...storeDto, name: 'Second Branch' });

        const ownerB = await makeUser();
        await approveMerchant(ownerB.id);
        await stores.createStore(ownerB.id, { ...storeDto, name: 'Other Merchant Store' });

        const result = await stores.listOwnStores(ownerA.id, { page: 1, limit: 20 });
        expect(result.data).toHaveLength(2);
        expect(result.meta.total).toBe(2);
    });

    it('admin approves a PENDING store into ACTIVE, then the merchant can pause and reopen it', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);
        const admin = await makeUser(['ADMIN']);

        const active = await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);
        expect(active.status).toBe('ACTIVE');

        const paused = await stores.updateStatusByMerchant(owner.id, store.id, 'PAUSED');
        expect(paused.status).toBe('PAUSED');

        const reopened = await stores.updateStatusByMerchant(owner.id, store.id, 'ACTIVE');
        expect(reopened.status).toBe('ACTIVE');
    });

    it('rejects a merchant activating straight from PENDING - admin approval required first', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);

        await expect(stores.updateStatusByMerchant(owner.id, store.id, 'ACTIVE')).rejects.toThrow();
    });

    it('admin can suspend an ACTIVE store and the merchant cannot self-reinstate it', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);
        const admin = await makeUser(['ADMIN']);
        await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);

        const suspended = await stores.updateStatusByAdmin(store.id, 'SUSPENDED', admin.id);
        expect(suspended.status).toBe('SUSPENDED');

        await expect(stores.updateStatusByMerchant(owner.id, store.id, 'ACTIVE')).rejects.toThrow();
    });

    it('never applies two concurrent status changes to the same store inconsistently', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);
        const admin = await makeUser(['ADMIN']);
        await stores.updateStatusByAdmin(store.id, 'ACTIVE', admin.id);

        const [a, b] = await Promise.allSettled([
            stores.updateStatusByMerchant(owner.id, store.id, 'PAUSED'),
            stores.updateStatusByAdmin(store.id, 'SUSPENDED', admin.id),
        ]);
        const outcomes = [a.status, b.status].sort();
        expect(outcomes).toEqual(['fulfilled', 'rejected']);

        const final = await prisma.store.findUniqueOrThrow({ where: { id: store.id } });
        expect(['PAUSED', 'SUSPENDED']).toContain(final.status);
    });

    it('rejects invalid operating hours (closing time not after opening time)', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);

        await expect(
            stores.updateHours(owner.id, store.id, { mon: { open: '20:00', close: '09:00' } }),
        ).rejects.toThrow();
    });

    it('updates pickup/delivery availability independently of other fields', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const store = await stores.createStore(owner.id, storeDto);

        const updated = await stores.updateAvailability(owner.id, store.id, {
            supportsPickup: false,
            supportsDelivery: true,
        });
        expect(updated.supports_pickup).toBe(false);
        expect(updated.supports_delivery).toBe(true);
    });
});

describe('HTTP wiring: controllers and guards (real DB, real guards)', () => {
    it('rejects an unauthenticated application submission', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/v1/merchants/me')
            .send(applicationDto);
        expect(res.status).toBe(401);
    });

    it('lets an authenticated user submit an application over HTTP', async () => {
        const user = await makeUser();
        const token = await tokenFor(user.id, ['CUSTOMER']);

        const res = await request(app.getHttpServer())
            .post('/api/v1/merchants/me')
            .set('Authorization', `Bearer ${token}`)
            .send(applicationDto);
        expect(res.status).toBe(201);
        expect(res.body.verification_status).toBe('PENDING');
    });

    it('denies a CUSTOMER (not yet MERCHANT_OWNER) from creating a store', async () => {
        const user = await makeUser();
        const token = await tokenFor(user.id, ['CUSTOMER']);

        const res = await request(app.getHttpServer())
            .post('/api/v1/merchants/me/stores')
            .set('Authorization', `Bearer ${token}`)
            .send(storeDto);
        expect(res.status).toBe(403);
    });

    it('denies a non-admin from reaching admin merchant endpoints', async () => {
        const user = await makeUser();
        const token = await tokenFor(user.id, ['CUSTOMER']);

        const res = await request(app.getHttpServer())
            .get('/api/v1/admin/merchants')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('lets an approved merchant (MERCHANT_OWNER) create a store over HTTP', async () => {
        const owner = await makeUser();
        await approveMerchant(owner.id);
        const token = await tokenFor(owner.id, ['CUSTOMER', 'MERCHANT_OWNER']);

        const res = await request(app.getHttpServer())
            .post('/api/v1/merchants/me/stores')
            .set('Authorization', `Bearer ${token}`)
            .send(storeDto);
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('PENDING');
    });
});
