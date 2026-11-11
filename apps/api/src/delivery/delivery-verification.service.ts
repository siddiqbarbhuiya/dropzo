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
 * One-time delivery-completion codes (`delivery_verifications`), structurally mirroring
 * `PickupVerificationService` - same cryptographic shape (`randomInt`, HMAC-SHA256 with its own
 * dedicated secret, `SELECT ... FOR UPDATE`, `timingSafeEqual`) - but its own table, its own
 * secret (`DELIVERY_CODE_HASH_SECRET`), and its own in-memory plaintext cache. Deliberately not a
 * subclass or a reused record: a compromised pickup secret/cache must never also compromise
 * delivery verification and vice versa. See `docs/04-design/DELIVERY-MANAGEMENT-DESIGN.md`.
 *
 * Keyed by `delivery_assignment_id`, not `order_id` - a rejected-then-reassigned assignment row is
 * reused (see `DeliveryAssignmentService`), so a stale verification from an earlier, now-replaced
 * partner attempt is naturally superseded once a fresh code is generated for the current
 * assignment lifecycle (the unique constraint on `delivery_assignment_id` means a second
 * `generateForAssignment` call for the same row updates the one existing record, never creates a
 * duplicate).
 */
@Injectable()
export class DeliveryVerificationService {
    private readonly plaintextCache = new Map<string, { code: string; expiresAt: number }>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    /** Called inside the partner's "mark out for delivery" transaction. Returns the plaintext once,
     * for the caller to deliver via the outbox event payload only - never returned from any
     * partner-facing API response. */
    async generateForAssignment(tx: Tx, assignmentId: string): Promise<string> {
        const code = randomInt(0, 10 ** CODE_LENGTH)
            .toString()
            .padStart(CODE_LENGTH, '0');
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);
        const codeHash = this.hashCode(code);
        await tx.deliveryVerification.upsert({
            where: { delivery_assignment_id: assignmentId },
            update: {
                code_hash: codeHash,
                expires_at: expiresAt,
                verified_at: null,
                attempt_count: 0,
            },
            create: {
                delivery_assignment_id: assignmentId,
                code_hash: codeHash,
                expires_at: expiresAt,
            },
        });
        this.plaintextCache.set(assignmentId, { code, expiresAt: expiresAt.getTime() });
        return code;
    }

    /**
     * Customer-facing retrieval. Ownership and visibility (only once `OUT_FOR_DELIVERY`) are the
     * caller's responsibility - see `CustomerDeliveryController`, which resolves the order via
     * `OrdersService.getOwnOrder` first. `codeAvailable: false` means a code was already issued and
     * viewed in an earlier process lifetime - the same documented single-instance limitation as
     * pickup codes (RISK-016), tracked separately for this table.
     */
    async getOwnCode(assignmentId: string): Promise<{
        expiresAt: Date;
        codeAvailable: boolean;
        code: string | null;
    }> {
        const verification = await this.prisma.deliveryVerification.findUnique({
            where: { delivery_assignment_id: assignmentId },
        });
        if (!verification) {
            throw new NotFoundException('No delivery code has been issued for this order yet.');
        }
        if (verification.verified_at) {
            throw new ConflictException('This order has already been delivered.');
        }
        if (verification.expires_at.getTime() < Date.now()) {
            throw new ConflictException(
                'Your delivery code has expired. Please contact support for help.',
            );
        }

        const cached = this.plaintextCache.get(assignmentId);
        if (cached && cached.expiresAt > Date.now()) {
            return { expiresAt: verification.expires_at, codeAvailable: true, code: cached.code };
        }
        return { expiresAt: verification.expires_at, codeAvailable: false, code: null };
    }

    /**
     * Partner-facing verification, run inside the caller's delivery-completion transaction. Locks
     * the verification row first (`FOR UPDATE`), the same pattern `PickupVerificationService.verify`
     * uses, so two simultaneous verification attempts for the same assignment can never both
     * succeed. Does **not** itself complete the order - the caller
     * (`DeliveryWorkflowService.completeDelivery`) does that only after this returns `'verified'`,
     * in the same transaction.
     */
    async verify(tx: Tx, assignmentId: string, suppliedCode: string): Promise<VerifyOutcome> {
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
            FROM "delivery_verifications"
            WHERE delivery_assignment_id = ${assignmentId}::uuid
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
            const updated = await tx.deliveryVerification.update({
                where: { id: verification.id },
                data: { attempt_count: { increment: 1 } },
            });
            const attemptsRemaining = Math.max(0, updated.max_attempts - updated.attempt_count);
            return { outcome: 'invalid', attemptsRemaining };
        }

        await tx.deliveryVerification.update({
            where: { id: verification.id },
            data: { verified_at: new Date() },
        });
        this.plaintextCache.delete(assignmentId);
        return { outcome: 'verified' };
    }

    private hashCode(code: string): string {
        const secret = this.config.getOrThrow<string>('DELIVERY_CODE_HASH_SECRET');
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
