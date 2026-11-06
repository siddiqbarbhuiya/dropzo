import { describe, expect, it } from 'vitest';
import { isNonEmptyString } from './index';

describe('isNonEmptyString', () => {
    it('accepts a non-empty string', () => {
        expect(isNonEmptyString('Dropzo')).toBe(true);
    });

    it('rejects an empty string', () => {
        expect(isNonEmptyString('   ')).toBe(false);
    });

    it('rejects a non-string value', () => {
        expect(isNonEmptyString(42)).toBe(false);
    });
});
