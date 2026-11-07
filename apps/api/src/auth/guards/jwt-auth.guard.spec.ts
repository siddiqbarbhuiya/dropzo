import { jest } from '@jest/globals';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { TokenService } from '../token.service.js';
import type { AuthenticatedRequest } from '../auth.types.js';

function makeContext(headers: Record<string, string> = {}, isPublic = false) {
    const request = { headers, params: {} } as AuthenticatedRequest;
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => ({}),
        getClass: () => ({}),
        request,
        _isPublic: isPublic,
    } as unknown as ExecutionContext & { request: AuthenticatedRequest };
}

describe('JwtAuthGuard', () => {
    it('allows a route marked @Public() through without checking the token', () => {
        const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
        const reflector = { getAllAndOverride: () => true } as never;
        const guard = new JwtAuthGuard(tokens, reflector);

        expect(guard.canActivate(makeContext())).toBe(true);
        expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('rejects a request with no Authorization header', () => {
        const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
        const reflector = { getAllAndOverride: () => false } as never;
        const guard = new JwtAuthGuard(tokens, reflector);

        expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException);
    });

    it('rejects a malformed Authorization header', () => {
        const tokens = { verifyAccessToken: jest.fn() } as unknown as TokenService;
        const reflector = { getAllAndOverride: () => false } as never;
        const guard = new JwtAuthGuard(tokens, reflector);

        expect(() => guard.canActivate(makeContext({ authorization: 'Basic abc123' }))).toThrow(
            UnauthorizedException,
        );
    });

    it('rejects an invalid or expired token', () => {
        const tokens = {
            verifyAccessToken: jest.fn(() => {
                throw new Error('invalid');
            }),
        } as unknown as TokenService;
        const reflector = { getAllAndOverride: () => false } as never;
        const guard = new JwtAuthGuard(tokens, reflector);

        expect(() => guard.canActivate(makeContext({ authorization: 'Bearer bad-token' }))).toThrow(
            UnauthorizedException,
        );
    });

    it('attaches the verified user to the request on success', () => {
        const tokens = {
            verifyAccessToken: jest.fn(() => ({
                sub: 'user-1',
                sid: 'session-1',
                roles: ['CUSTOMER'],
            })),
        } as unknown as TokenService;
        const reflector = { getAllAndOverride: () => false } as never;
        const guard = new JwtAuthGuard(tokens, reflector);

        const context = makeContext({ authorization: 'Bearer good-token' });
        expect(guard.canActivate(context)).toBe(true);
        expect(context.request.user).toEqual({
            id: 'user-1',
            sessionId: 'session-1',
            roles: ['CUSTOMER'],
        });
    });
});
