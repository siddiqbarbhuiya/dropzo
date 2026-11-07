import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../auth.types.js';

/**
 * Merchant/store authorization foundation (BC-005 Phase 7). Resolves the merchant a route
 * actually concerns - from a `:merchantId` param directly, or a `:storeId` param resolved to its
 * owning merchant - and checks the authenticated user is either that merchant's owner
 * (merchants.owner_user_id) or listed in merchant_staff for it. Never trusts the merchant/store id
 * for anything beyond "which merchant does this request claim to be about" - ownership is always
 * re-checked server-side against the database, never inferred from the token or the URL alone.
 *
 * This is the foundation only: it has no merchant/store CRUD routes of its own to protect yet
 * (those are a separate, future task - see TASK-TRACKER.md). It is exercised directly by its own
 * unit/integration tests and is ready to apply to real merchant routes as they're built.
 */
@Injectable()
export class MerchantAccessGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const merchantId = await this.resolveMerchantId(request);
        if (!merchantId) {
            throw new ForbiddenException('No merchant or store context found on this request.');
        }

        const userId = request.user.id;
        const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
        if (!merchant) {
            throw new ForbiddenException('Merchant not found.');
        }
        if (merchant.owner_user_id === userId) {
            return true;
        }

        const staffMembership = await this.prisma.merchantStaff.findFirst({
            where: { merchant_id: merchantId, user_id: userId },
        });
        if (!staffMembership) {
            throw new ForbiddenException('You do not have access to this merchant.');
        }
        return true;
    }

    private async resolveMerchantId(request: AuthenticatedRequest): Promise<string | null> {
        const merchantId = this.singleParam(request.params.merchantId);
        if (merchantId) {
            return merchantId;
        }

        const storeId = this.singleParam(request.params.storeId);
        if (storeId) {
            const store = await this.prisma.store.findUnique({ where: { id: storeId } });
            return store?.merchant_id ?? null;
        }

        return null;
    }

    private singleParam(value: string | string[] | undefined): string | undefined {
        return Array.isArray(value) ? value[0] : value;
    }
}
