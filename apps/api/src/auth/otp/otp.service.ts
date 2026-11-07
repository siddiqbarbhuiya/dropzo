import { randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { OtpProvider } from './otp-provider.interface.js';
import { OTP_PROVIDER } from './otp.constants.js';

export type OtpRequestResult =
    { outcome: 'sent' } | { outcome: 'cooldown'; retryAfterSeconds: number };

export type OtpVerifyResult =
    | { outcome: 'verified' }
    | { outcome: 'invalid'; attemptsRemaining: number }
    | { outcome: 'expired' }
    | { outcome: 'locked' }
    | { outcome: 'not_found' };

/**
 * OTP lifecycle: request -> (rate limits, cooldown) -> hash + store + send -> verify -> (single
 * use, attempt-limited, expiry-checked). See docs/04-design/AUTHENTICATION-DESIGN.md for the full
 * design and the exact responses chosen to avoid leaking account existence or OTP validity beyond
 * what a legitimate client needs.
 */
@Injectable()
export class OtpService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        @Inject(OTP_PROVIDER) private readonly provider: OtpProvider,
    ) {}

    async requestOtp(phone: string, ipAddress: string | null): Promise<OtpRequestResult> {
        const cooldownSeconds = this.config.get<number>('OTP_RESEND_COOLDOWN_SECONDS', 30);
        const mostRecent = await this.prisma.otpChallenge.findFirst({
            where: { phone },
            orderBy: { created_at: 'desc' },
        });
        if (mostRecent) {
            const elapsedSeconds = (Date.now() - mostRecent.created_at.getTime()) / 1000;
            if (elapsedSeconds < cooldownSeconds) {
                return {
                    outcome: 'cooldown',
                    retryAfterSeconds: Math.ceil(cooldownSeconds - elapsedSeconds),
                };
            }
        }

        await this.enforceRateLimits(phone, ipAddress);

        const codeLength = this.config.get<number>('OTP_CODE_LENGTH', 6);
        const expirySeconds = this.config.get<number>('OTP_EXPIRY_SECONDS', 300);
        const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);
        const code = this.generateCode(codeLength);

        await this.prisma.otpChallenge.create({
            data: {
                phone,
                code_hash: this.hashCode(code),
                max_attempts: maxAttempts,
                expires_at: new Date(Date.now() + expirySeconds * 1000),
                ip_address: ipAddress ?? undefined,
            },
        });

        await this.provider.send(phone, code);
        return { outcome: 'sent' };
    }

    /**
     * Locks the pending challenge row (SELECT ... FOR UPDATE, same pattern BC-004 established for
     * inventory/FEFO) before reading or writing it, inside one transaction - so two concurrent
     * verify attempts for the same phone (e.g. a duplicated client request, or an attacker racing
     * a guess against a legitimate attempt) can never both observe and act on the same still-valid
     * state. The second transaction blocks until the first commits, then sees the already-updated
     * row (VERIFIED, or one attempt further used up) and responds accordingly - never a duplicate
     * success.
     */
    async verifyOtp(phone: string, code: string): Promise<OtpVerifyResult> {
        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw<
                Array<{
                    id: string;
                    expires_at: Date;
                    attempt_count: number;
                    max_attempts: number;
                    code_hash: string;
                }>
            >`
                SELECT id, expires_at, attempt_count, max_attempts, code_hash
                FROM "otp_challenges"
                WHERE phone = ${phone} AND status = 'PENDING'
                ORDER BY created_at DESC
                LIMIT 1
                FOR UPDATE
            `;
            const challenge = rows[0];
            if (!challenge) {
                return { outcome: 'not_found' };
            }
            if (challenge.expires_at.getTime() < Date.now()) {
                await tx.otpChallenge.update({
                    where: { id: challenge.id },
                    data: { status: 'EXPIRED' },
                });
                return { outcome: 'expired' };
            }
            if (challenge.attempt_count >= challenge.max_attempts) {
                return { outcome: 'locked' };
            }

            const matches = this.compareHash(code, challenge.code_hash);
            if (!matches) {
                const updated = await tx.otpChallenge.update({
                    where: { id: challenge.id },
                    data: { attempt_count: { increment: 1 } },
                });
                const attemptsRemaining = Math.max(0, updated.max_attempts - updated.attempt_count);
                if (attemptsRemaining === 0) {
                    await tx.otpChallenge.update({
                        where: { id: challenge.id },
                        data: { status: 'FAILED' },
                    });
                    return { outcome: 'locked' };
                }
                return { outcome: 'invalid', attemptsRemaining };
            }

            await tx.otpChallenge.update({
                where: { id: challenge.id },
                data: { status: 'VERIFIED', verified_at: new Date() },
            });
            return { outcome: 'verified' };
        });
    }

    private async enforceRateLimits(phone: string, ipAddress: string | null): Promise<void> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const perPhoneLimit = this.config.get<number>('OTP_PER_PHONE_HOURLY_LIMIT', 5);
        const phoneCount = await this.prisma.otpChallenge.count({
            where: { phone, created_at: { gte: oneHourAgo } },
        });
        if (phoneCount >= perPhoneLimit) {
            throw new HttpException(
                'Too many OTP requests for this phone number.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        if (ipAddress) {
            const perIpLimit = this.config.get<number>('OTP_PER_IP_HOURLY_LIMIT', 20);
            const ipCount = await this.prisma.otpChallenge.count({
                where: { ip_address: ipAddress, created_at: { gte: oneHourAgo } },
            });
            if (ipCount >= perIpLimit) {
                throw new HttpException(
                    'Too many OTP requests from this network.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        }
    }

    private generateCode(length: number): string {
        const max = 10 ** length;
        return randomInt(0, max).toString().padStart(length, '0');
    }

    private hashCode(code: string): string {
        const secret = this.config.getOrThrow<string>('OTP_HASH_SECRET');
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
