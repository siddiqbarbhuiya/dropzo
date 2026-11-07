import {
    Body,
    Controller,
    ForbiddenException,
    NotFoundException,
    Param,
    Patch,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { RequestUser } from './auth.types.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

/**
 * The only way a user ever gains or loses a role beyond the CUSTOMER role every registration
 * starts with (see AuthService.findOrCreateUser). ADMIN/SUPER_ADMIN only, every change
 * audit-logged with who/what/when. There is deliberately no public, self-service, or
 * registration-time path to any other role - see docs/04-design/AUTHENTICATION-DESIGN.md's
 * "Role assignment" section, including how the very first admin account is bootstrapped (a
 * documented manual/seed step, not a public endpoint, for the same reason).
 */
@ApiTags('admin')
@Controller('admin/users')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminRolesController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    @Patch(':id/roles')
    @ApiOperation({ summary: "Grant or revoke one of a user's roles. ADMIN/SUPER_ADMIN only." })
    @ApiOkResponse({ description: 'The role change was applied.' })
    async updateRole(
        @Param('id') targetUserId: string,
        @Body() dto: UpdateRoleDto,
        @CurrentUser() actor: RequestUser,
    ) {
        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            throw new NotFoundException('User not found.');
        }

        if (dto.role === 'SUPER_ADMIN' && !actor.roles.includes('SUPER_ADMIN')) {
            throw new ForbiddenException('Only a SUPER_ADMIN can grant or revoke SUPER_ADMIN.');
        }

        if (dto.action === 'GRANT') {
            await this.prisma.userRole.upsert({
                where: { user_id_role: { user_id: targetUserId, role: dto.role } },
                update: {},
                create: { user_id: targetUserId, role: dto.role },
            });
        } else {
            await this.prisma.userRole.deleteMany({
                where: { user_id: targetUserId, role: dto.role },
            });
        }

        await this.audit.record({
            actorUserId: actor.id,
            action: `AUTH_ROLE_${dto.action}ED`,
            entityType: 'user',
            entityId: targetUserId,
            afterState: { role: dto.role },
        });

        const roles = await this.prisma.userRole.findMany({ where: { user_id: targetUserId } });
        return { userId: targetUserId, roles: roles.map((r) => r.role) };
    }
}
