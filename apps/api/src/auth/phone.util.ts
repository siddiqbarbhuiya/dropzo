// 'libphonenumber-js/core' plus an explicit metadata argument on every call (rather than relying
// on '/max' to auto-bind full metadata internally) - some bundler/test-runner module resolution
// pipelines (observed under ts-jest's ESM transform) pick a different, metadata-less build of the
// package's several export conditions despite resolving the same subpath, silently breaking the
// 2-argument call form. Passing metadata explicitly works the same regardless of which physical
// file actually gets loaded.
import { parsePhoneNumberWithError, ParseError } from 'libphonenumber-js/core';
import metadata from 'libphonenumber-js/metadata.full.json';

export class InvalidPhoneNumberError extends Error {
    constructor(message = 'Invalid phone number.') {
        super(message);
        this.name = 'InvalidPhoneNumberError';
    }
}

/**
 * Normalizes a phone number to E.164 (e.g. "+919876543210"). Defaults to the Indian region (`IN`)
 * for Dropzo's initial launch per FR-AUTH-001, but accepts an explicit country code too (e.g.
 * "+1..."), so additional countries need no change here - only a product decision to accept them.
 */
export function normalizePhoneNumber(input: string, defaultCountry: 'IN' = 'IN'): string {
    try {
        const parsed = parsePhoneNumberWithError(input, defaultCountry, metadata);
        if (!parsed.isValid()) {
            throw new InvalidPhoneNumberError();
        }
        return parsed.number;
    } catch (error) {
        if (error instanceof ParseError) {
            throw new InvalidPhoneNumberError();
        }
        throw error;
    }
}
