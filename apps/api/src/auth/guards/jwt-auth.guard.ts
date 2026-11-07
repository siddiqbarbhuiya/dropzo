import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../token.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../auth.types.js';

/**
 * Deny-by-default: every route is protected unless explicitly marked @Public(). Extracts and
 * verifies the access token, then attaches a minimal RequestUser to the request for downstream
 * guards/handlers - never trusts any user/role identifier supplied by the client itself.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly tokens: TokenService,
        private readonly reflector: Reflector,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const header = request.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or malformed Authorization header.');
        }

        const token = header.slice('Bearer '.length).trim();
        try {
            const claims = this.tokens.verifyAccessToken(token);
            request.user = { id: claims.sub, roles: claims.roles, sessionId: claims.sid };
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired access token.');
        }
    }
}
