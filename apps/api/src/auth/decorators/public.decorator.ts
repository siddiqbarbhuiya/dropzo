import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'dropzo:isPublic';

/**
 * Marks a route as not requiring authentication - used only for routes that must be reachable
 * before a session exists (health check, OTP request/verify, refresh). The default is deny: a
 * route is protected unless explicitly marked @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
