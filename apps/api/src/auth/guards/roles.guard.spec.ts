import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedRequest } from '../auth.types.js';

function makeContext(userRoles: string[]) {
    const request = {
        user: { id: 'u1', roles: userRoles, sessionId: 's1' },
    } as AuthenticatedRequest;
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
    it('allows access when the route has no @Roles() requirement', () => {
        const reflector = { getAllAndOverride: () => undefined } as never;
        const guard = new RolesGuard(reflector);

        expect(guard.canActivate(makeContext(['CUSTOMER']))).toBe(true);
    });

    it('allows access when the user has one of the required roles', () => {
        const reflector = { getAllAndOverride: () => ['ADMIN', 'SUPER_ADMIN'] } as never;
        const guard = new RolesGuard(reflector);

        expect(guard.canActivate(makeContext(['ADMIN']))).toBe(true);
    });

    it('denies access when the user has none of the required roles', () => {
        const reflector = { getAllAndOverride: () => ['ADMIN'] } as never;
        const guard = new RolesGuard(reflector);

        expect(() => guard.canActivate(makeContext(['CUSTOMER']))).toThrow(ForbiddenException);
    });

    it('denies a customer attempting to reach a merchant-only route', () => {
        const reflector = {
            getAllAndOverride: () => ['MERCHANT_OWNER', 'MERCHANT_STAFF'],
        } as never;
        const guard = new RolesGuard(reflector);

        expect(() => guard.canActivate(makeContext(['CUSTOMER']))).toThrow(ForbiddenException);
    });
});
