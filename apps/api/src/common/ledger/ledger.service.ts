import { Injectable } from '@nestjs/common';
import type { Merchant, Order, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

/**
 * The financial ledger (`docs/04-design/DATABASE-DESIGN.md`'s "Financial accounting model") -
 * narrowly scoped to the one event BC-009 actually needs to post: a COD order reaching
 * `COMPLETED`. Not a general-purpose ledger-posting API for every future event type - each new
 * event this project adds should get its own narrow method here (reusing the account-lookup
 * helpers), never a parallel, duplicate posting mechanism.
 */
@Injectable()
export class LedgerService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Posts exactly the two paired entries `DATABASE-DESIGN.md`'s "What posts, and when" table
     * documents for a COD sale, in one `ledger_transactions` row (the deferred balance-check
     * trigger requires every transaction's debits to equal its credits - two separate rows would
     * each need to balance on their own, which splitting the commission leg would violate):
     *
     * - `DEBIT COD_CASH_CLEARING` / `CREDIT MERCHANT_PAYABLE`, the gross amount (cash now held,
     *   pending reconciliation; the full amount owed to the merchant before commission).
     * - `DEBIT MERCHANT_PAYABLE` / `CREDIT PLATFORM_COMMISSION_REVENUE`, the commission amount
     *   (reduces what's owed to the merchant by what the platform earned) - "same transaction as
     *   the order sale" per the design doc, not a second one.
     *
     * No delivery-fee leg - BC-009 is pickup-only (`fulfilment_type = PICKUP` is enforced before
     * this is ever called); a delivery order's extra leg is a later milestone's concern.
     */
    async postCodCollection(tx: Tx, order: Order, merchant: Merchant): Promise<void> {
        const gross = Number(order.total_amount);
        const commission = round2(gross * (Number(merchant.commission_percent) / 100));

        const merchantPayable = await this.findOrCreateMerchantAccount(
            tx,
            'MERCHANT_PAYABLE',
            merchant.id,
        );
        const codClearing = await this.findOrCreatePlatformAccount(tx, 'COD_CASH_CLEARING');
        const commissionRevenue = await this.findOrCreatePlatformAccount(
            tx,
            'PLATFORM_COMMISSION_REVENUE',
        );

        const transaction = await tx.ledgerTransaction.create({
            data: {
                transaction_type: 'ORDER_SALE_COD',
                reference_type: 'ORDER',
                reference_id: order.id,
                description: `COD collection for order ${order.order_number}`,
            },
        });

        await tx.ledgerEntry.createMany({
            data: [
                {
                    transaction_id: transaction.id,
                    account_id: codClearing.id,
                    direction: 'DEBIT',
                    amount: gross,
                },
                {
                    transaction_id: transaction.id,
                    account_id: merchantPayable.id,
                    direction: 'CREDIT',
                    amount: gross,
                },
                ...(commission > 0
                    ? [
                          {
                              transaction_id: transaction.id,
                              account_id: merchantPayable.id,
                              direction: 'DEBIT',
                              amount: commission,
                          },
                          {
                              transaction_id: transaction.id,
                              account_id: commissionRevenue.id,
                              direction: 'CREDIT',
                              amount: commission,
                          },
                      ]
                    : []),
            ],
        });
    }

    /**
     * `financial_accounts` has no seed-independent guarantee of existing - the deterministic seed
     * (which creates the four platform accounts) only ever runs against the development database,
     * never the integration-test database (see `jest.integration.config.cjs`'s own CI step), and a
     * merchant's own `MERCHANT_PAYABLE` account is never created at merchant-approval time today.
     * Find-or-create here, rather than assuming either exists, is what makes ledger posting work
     * correctly regardless of whether seeding happened - a safer property for core business logic
     * to have than depending on demo/dev-only seed data.
     */
    private async findOrCreateMerchantAccount(
        tx: Tx,
        accountType: string,
        merchantId: string,
    ): Promise<{ id: string }> {
        const existing = await tx.financialAccount.findUnique({
            where: {
                account_type_merchant_id: { account_type: accountType, merchant_id: merchantId },
            },
        });
        if (existing) return existing;
        return tx.financialAccount.create({
            data: { account_type: accountType, owner_type: 'MERCHANT', merchant_id: merchantId },
        });
    }

    /**
     * A plain `WHERE merchant_id = NULL` never matches in SQL (the same reason `seed.ts` uses
     * find-then-create instead of `upsert` for these rows) - find-then-create here too.
     */
    private async findOrCreatePlatformAccount(
        tx: Tx,
        accountType: string,
    ): Promise<{ id: string }> {
        const existing = await tx.financialAccount.findFirst({
            where: { account_type: accountType, merchant_id: null },
        });
        if (existing) return existing;
        return tx.financialAccount.create({
            data: { account_type: accountType, owner_type: 'PLATFORM', merchant_id: null },
        });
    }
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}
