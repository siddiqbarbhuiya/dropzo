/** A single OTP delivery attempt's outcome, for logging/audit - never includes the code itself. */
export interface OtpSendResult {
    provider: string;
    /** Provider-side identifier for the delivery attempt, if the provider returns one. */
    providerReference?: string;
}

/** Thrown by a provider when delivery fails - callers distinguish this from a programming error. */
export class OtpDeliveryError extends Error {
    constructor(
        public readonly provider: string,
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'OtpDeliveryError';
    }
}

/**
 * Clean seam between OTP business logic (OtpService) and however a code actually reaches a phone.
 * Implementations never see application state beyond the phone number and code; OtpService never
 * knows which vendor (if any) is behind this interface. See
 * docs/04-design/AUTHENTICATION-DESIGN.md for the full contract and how to add a real provider.
 */
export interface OtpProvider {
    readonly name: string;
    send(phone: string, code: string): Promise<OtpSendResult>;
}
