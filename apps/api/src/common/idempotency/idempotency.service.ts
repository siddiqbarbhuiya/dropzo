import { createHash } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

const DEFAULT_TTL_HOURS = 24;

export type IdempotencyOutcome<T> =
    { kind: 'completed'; response: T } | { kind: 'in_progress' } | { kind: 'proceed' };

/**
 * Generic request-idempotency gate backed by `idempotency_records`, implementing
 * docs/04-design/DATABASE-DESIGN.md's "Request handling with idempotency_records" exactly:
 * (scope, user_id, idempotency_key) is unique, so only one concurrent request's INSERT can ever
 * succeed - the loser always observes the winner's row rather than both proceeding. A reused key
 * with a different request body is a client bug (reject), not a safe retry; a key whose previous
 * attempt FAILED gets a fresh attempt (reset to IN_PROGRESS) rather than being poisoned forever.
 */
@Injectable()
export class IdempotencyService {
    constructor(private readonly prisma: PrismaService) {}

    static hashPayload(payload: unknown): string {
        return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }

    /**
     * Call before doing any work. Returns 'completed' with the original response to replay
     * verbatim, 'in_progress' if another attempt (or this one, racing) is already running, or
     * 'proceed' once this call itself has safely claimed the key (fresh, or reusing a FAILED key).
     */
    async begin<T = unknown>(
        scope: string,
        userId: string,
        idempotencyKey: string,
        payload: unknown,
    ): Promise<IdempotencyOutcome<T>> {
        const requestHash = IdempotencyService.hashPayload(payload);
        const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);

        try {
            await this.prisma.idempotencyRecord.create({
                data: {
                    scope,
                    user_id: userId,
                    idempotency_key: idempotencyKey,
                    request_hash: requestHash,
                    status: 'IN_PROGRESS',
                    expires_at: expiresAt,
                },
            });
            return { kind: 'proceed' };
        } catch {
            // Unique-constraint violation on (scope, user_id, idempotency_key) - a row already
            // exists, from this request's own race loss or an earlier attempt.
        }

        const existing = await this.prisma.idempotencyRecord.findUniqueOrThrow({
            where: {
                scope_user_id_idempotency_key: {
                    scope,
                    user_id: userId,
                    idempotency_key: idempotencyKey,
                },
            },
        });

        if (existing.request_hash !== requestHash) {
            throw new ConflictException(
                'This idempotency key was already used with a different request body.',
            );
        }

        if (existing.status === 'COMPLETED') {
            return { kind: 'completed', response: existing.response_snapshot as T };
        }

        if (existing.status === 'IN_PROGRESS') {
            return { kind: 'in_progress' };
        }

        // status === 'FAILED': the previous attempt had no committed side effect - allow a fresh
        // attempt. Compare-and-swap so two simultaneous retries can't both believe they "won" the
        // reset; the loser is treated as in_progress rather than double-proceeding.
        const reset = await this.prisma.idempotencyRecord.updateMany({
            where: { id: existing.id, status: 'FAILED' },
            data: { status: 'IN_PROGRESS', request_hash: requestHash, expires_at: expiresAt },
        });
        return reset.count === 1 ? { kind: 'proceed' } : { kind: 'in_progress' };
    }

    async complete(
        scope: string,
        userId: string,
        idempotencyKey: string,
        response: Prisma.InputJsonValue,
    ): Promise<void> {
        await this.prisma.idempotencyRecord.updateMany({
            where: { scope, user_id: userId, idempotency_key: idempotencyKey },
            data: { status: 'COMPLETED', response_snapshot: response },
        });
    }

    async fail(scope: string, userId: string, idempotencyKey: string): Promise<void> {
        await this.prisma.idempotencyRecord.updateMany({
            where: { scope, user_id: userId, idempotency_key: idempotencyKey },
            data: { status: 'FAILED' },
        });
    }
}
