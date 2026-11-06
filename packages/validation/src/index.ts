import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);

export function isNonEmptyString(value: unknown): value is string {
    return nonEmptyString.safeParse(value).success;
}
