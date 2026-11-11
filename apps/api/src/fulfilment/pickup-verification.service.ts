import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

const CODE_LENGTH = 6;
const CODE_TTL_MS = 48 * 60 * 60 * 1000;

export type VerifyOutcome =
    | { outcome: 'verified' }
    | { outcome: 'invalid'; attemptsRemaining: number }
    | { outcome: 'expired' }
    | { outcome: 'locked' }
    | { outcome: 'not_found' };

/**
 * One-time pickup codes (`pickup_verifications`), mirroring the exact cryptographic pattern
 * `OtpService` already established: `randomInt` generation, HMAC-SHA256 hashing with its own
 * dedicated secret (`PICKUP_CODE_HASH_SECRET` - never reused from `OTP_HASH_SECRET`, a different
 * purpose), `timingSafeEqual` comparison, and a `SELECT ... FOR UPDATE` row lock before reading or
 * writing the verification row so two concurrent verification attempts can never both succeed.
 *
 * **Only a hash is ever persisted** (`code_hash`) - the plaintext is never written to any durable
 * store. This creates a real, deliberate limitation documented in
 * `docs/04-design/PICKUP-WORKFLOW-DESIGN.md`'s "Code retrieval after the first view": the
 * plaintext is cached in this process's own memory (keyed by order id, evicted at the code's own
 * expiry) solely so the customer can view it more than once before collecting - evicted on
 * restart, and never shared across horizontally-scaled instances. That is an accepted limitation
 * for this single-instance MVP, not a security compromise: the durable record (the only thing a
 * backup, a DB admin, or an attacker with read access to the database could ever see) is always
 * hash-only.
 */
@Injectable()
export class PickupVerificationService {
    private readonly plaintextCache = new Map<string, { code: string; expiresAt: number }>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    /** Called inside the merchant's "mark ready" transaction. Returns the plaintext once, for the
     * caller to deliver via the outbox event payload only - never returned from any merchant API
     * response (see MerchantOrdersController / PICKUP-WORKFLOW-DESIGN.md). */
    async generateForOrder(tx: Tx, orderId: string): Promise<string> {
        const code = randomInt(0, 10 ** CODE_LENGTH)
            .toString()
            .padStart(CODE_LENGTH, '0');
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);
        await tx.pickupVerification.create({
            data: { order_id: orderId, code_hash: this.hashCode(code), expires_at: expiresAt },
        });
        this.plaintextCache.set(orderId, { code, expiresAt: expiresAt.getTime() });
        return code;
    }

    /**
     * Customer-facing retrieval. Never reveals another customer's code (ownership is the caller's
     * responsibility - see CustomerPickupController, which resolves the order via
     * `OrdersService.getOwnOrder` first) and never reveals digits for an order that isn't
     * currently `READY` (the caller checks this before calling in). `codeAvailable: false` means a
     * code was already issued and viewed in an earlier process lifetime - see the class doc.
     */
    async getOwnCode(orderId: string): Promise<{
        expiresAt: Date;
        codeAvailable: boolean;
        code: string | null;
    }> {
        const verification = await this.prisma.pickupVerification.findUnique({
            where: { order_id: orderId },
        });
        if (!verification) {
            throw new NotFoundException('No pickup code has been issued for this order yet.');
        }
        if (verification.verified_at) {
            throw new ConflictException('This order has already been collected.');
        }
        if (verification.expires_at.getTime() < Date.now()) {
            throw new ConflictException(
                'Your pickup code has expired. Please contact the store for help.',
            );
        }

        const cached = this.plaintextCache.get(orderId);
        if (cached && cached.expiresAt > Date.now()) {
            return { expiresAt: verification.expires_at, codeAvailable: true, code: cached.code };
        }
        return { expiresAt: verification.expires_at, codeAvailable: false, code: null };
    }

    /**
     * Merchant-facing verification, run inside the caller's order-completion transaction. Locks
     * the verification row first (`FOR UPDATE`) - the same pattern `OtpService.verifyOtp` uses -
     * so two simultaneous verification attempts for the same order can never both see
     * `verified_at IS NULL` and both proceed; the loser blocks until the winner commits, then sees
     * the already-verified row. Does **not** itself complete the order - the caller
     * (`MerchantOrdersService.completePickup`) does that only after this returns `'verified'`, in
     * the same transaction.
     */
    async verify(tx: Tx, orderId: string, suppliedCode: string): Promise<VerifyOutcome> {
        const rows = await tx.$queryRaw<
            Array<{
                id: string;
                code_hash: string;
                expires_at: Date;
                verified_at: Date | null;
                attempt_count: number;
                max_attempts: number;
            }>
        >`
            SELECT id, code_hash, expires_at, verified_at, attempt_count, max_attempts
            FROM "pickup_verifications"
            WHERE order_id = ${orderId}::uuid
            FOR UPDATE
        `;
        const verification = rows[0];
        if (!verification) {
            return { outcome: 'not_found' };
        }
        if (verification.verified_at) {
            return { outcome: 'locked' };
        }
        if (verification.expires_at.getTime() < Date.now()) {
            return { outcome: 'expired' };
        }
        if (verification.attempt_count >= verification.max_attempts) {
            return { outcome: 'locked' };
        }

        const matches = this.compareHash(suppliedCode, verification.code_hash);
        if (!matches) {
            const updated = await tx.pickupVerification.update({
                where: { id: verification.id },
                data: { attempt_count: { increment: 1 } },
            });
            const attemptsRemaining = Math.max(0, updated.max_attempts - updated.attempt_count);
            return { outcome: 'invalid', attemptsRemaining };
        }

        await tx.pickupVerification.update({
            where: { id: verification.id },
            data: { verified_at: new Date() },
        });
        this.plaintextCache.delete(orderId);
        return { outcome: 'verified' };
    }

    private hashCode(code: string): string {
        const secret = this.config.getOrThrow<string>('PICKUP_CODE_HASH_SECRET');
        return createHmac('sha256', secret).update(code).digest('hex');
    }

    private compareHash(code: string, storedHash: string): boolean {
        const computed = Buffer.from(this.hashCode(code), 'hex');
        const stored = Buffer.from(storedHash, 'hex');
        if (computed.length !== stored.length) {
            return false;
        }
        return timingSafeEqual(computed, stored);
    }
}
