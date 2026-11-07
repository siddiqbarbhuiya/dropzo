import { InvalidPhoneNumberError, normalizePhoneNumber } from './phone.util.js';

describe('normalizePhoneNumber', () => {
    it('normalizes a bare 10-digit Indian mobile number to E.164', () => {
        expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    });

    it('accepts a number already in E.164 form', () => {
        expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    });

    it('accepts common formatting (spaces, leading 0)', () => {
        expect(normalizePhoneNumber('098765 43210')).toBe('+919876543210');
    });

    it('normalizes the same number to the same result regardless of input format', () => {
        const a = normalizePhoneNumber('9876543210');
        const b = normalizePhoneNumber('+91 98765 43210');
        expect(a).toBe(b);
    });

    it('rejects a number that is too short to be valid', () => {
        expect(() => normalizePhoneNumber('12345')).toThrow(InvalidPhoneNumberError);
    });

    it('rejects a clearly invalid string', () => {
        expect(() => normalizePhoneNumber('not-a-phone-number')).toThrow(InvalidPhoneNumberError);
    });

    it('accepts an explicit non-Indian country code without needing a default-country change', () => {
        expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    });
});
