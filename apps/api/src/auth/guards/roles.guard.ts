import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth.types.js';

/**
 * Must run after JwtAuthGuard (request.user must already be set). A route with no @Roles()
 * decorator is allowed through unchanged - RolesGuard only narrows access further, it never
 * widens it; authentication itself is JwtAuthGuard's job.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const hasRole = request.user.roles.some((role) => requiredRoles.includes(role));
        if (!hasRole) {
            throw new ForbiddenException('You do not have permission to perform this action.');
        }
        return true;
    }
}
