import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'dropzo:roles';

/** Marks a route as requiring at least one of the given roles - see RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
