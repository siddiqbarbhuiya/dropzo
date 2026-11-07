import type { Request } from 'express';

/** Attached to the request by JwtAuthGuard - never the full user row, only what guards need. */
export interface RequestUser {
    id: string;
    roles: string[];
    sessionId: string;
}

export interface AuthenticatedRequest extends Request {
    user: RequestUser;
}
