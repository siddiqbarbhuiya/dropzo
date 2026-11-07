import { Injectable, Logger } from '@nestjs/common';
import type { OtpProvider, OtpSendResult } from '../otp-provider.interface.js';

/**
 * Development/test OTP provider - logs the code to the server console instead of sending a real
 * SMS, and remembers the last code per phone number so integration tests can retrieve it through
 * `getLastCodeForTesting`, a controlled, explicit mechanism - never by parsing logs or exposing
 * the code in an API response. See OtpProviderFactory for the hard production guard: this class
 * can be instantiated, but the factory refuses to select it when NODE_ENV=production, regardless
 * of OTP_PROVIDER's configured value.
 */
@Injectable()
export class DevOtpProvider implements OtpProvider {
    readonly name = 'dev';
    private readonly logger = new Logger(DevOtpProvider.name);
    private readonly lastCodeByPhone = new Map<string, string>();

    send(phone: string, code: string): Promise<OtpSendResult> {
        this.lastCodeByPhone.set(phone, code);
        this.logger.warn(
            `[DEV OTP - never sent as a real SMS] phone=${phone} code=${code} - ` +
                'this provider must never be selected in production.',
        );
        return Promise.resolve({ provider: this.name });
    }

    /** Test-only retrieval - never called from application request-handling code. */
    getLastCodeForTesting(phone: string): string | undefined {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('getLastCodeForTesting must never be called in production.');
        }
        return this.lastCodeByPhone.get(phone);
    }
}
