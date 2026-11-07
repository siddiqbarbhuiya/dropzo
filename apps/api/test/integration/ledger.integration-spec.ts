// Financial accounting integrity (BC-004-IMPLEMENTATION-PLAN.md Stage 9, "Database integrity and
// concurrency tests" + DATABASE-DESIGN.md's "Financial accounting model" worked example).
import { randomUUID } from 'node:crypto';
import { adminPrisma, appPrisma, disconnectAll, resetDatabase } from '../helpers/clients.js';
import { postLedgerTransaction } from '../helpers/ledger.js';

async function createMerchantWithPayable() {
    const owner = await adminPrisma.user.create({
        data: { phone: `+91${randomUUID().slice(0, 9)}` },
    });
    const merchant = await adminPrisma.merchant.create({
        data: {
            owner_user_id: owner.id,
            legal_name: 'x',
            display_name: 'x',
            contact_phone: '1',
            business_address: 'x',
        },
    });
    const payable = await adminPrisma.financialAccount.create({
        data: {
            account_type: 'MERCHANT_PAYABLE',
            owner_type: 'MERCHANT',
            merchant_id: merchant.id,
        },
    });
    return { merchant, payable };
}

async function platformAccount(account_type: string) {
    return adminPrisma.financialAccount.create({
        data: { account_type, owner_type: 'PLATFORM', merchant_id: null },
    });
}

describe('financial ledger', () => {
    afterAll(async () => {
        await disconnectAll();
    });

    beforeEach(async () => {
        await resetDatabase();
    });

    it('accepts a balanced ledger transaction', async () => {
        const { payable } = await createMerchantWithPayable();
        const codClearing = await platformAccount('COD_CASH_CLEARING');

        const txId = await postLedgerTransaction(adminPrisma, 'ORDER_SALE', [
            { accountId: codClearing.id, direction: 'DEBIT', amount: 400 },
            { accountId: payable.id, direction: 'CREDIT', amount: 400 },
        ]);

        const entries = await adminPrisma.ledgerEntry.findMany({ where: { transaction_id: txId } });
        expect(entries).toHaveLength(2);
    });

    it('rejects an unbalanced ledger transaction at commit time', async () => {
        const { payable } = await createMerchantWithPayable();
        const codClearing = await platformAccount('COD_CASH_CLEARING');

        await expect(
            postLedgerTransaction(adminPrisma, 'ORDER_SALE', [
                { accountId: codClearing.id, direction: 'DEBIT', amount: 400 },
                { accountId: payable.id, direction: 'CREDIT', amount: 399 },
            ]),
        ).rejects.toThrow();

        const count = await adminPrisma.ledgerTransaction.count();
        expect(count).toBe(0); // the whole transaction rolled back, including the header row
    });

    it('reproduces the worked settlement example from DATABASE-DESIGN.md', async () => {
        const { merchant, payable } = await createMerchantWithPayable();
        const codClearing = await platformAccount('COD_CASH_CLEARING');
        const commissionRevenue = await platformAccount('PLATFORM_COMMISSION_REVENUE');
        const platformCash = await platformAccount('PLATFORM_CASH');

        // Order O1: COD ₹400, 8% commission -> DEBIT COD_CASH_CLEARING 400, CREDIT PAYABLE 400,
        // DEBIT PAYABLE 32, CREDIT COMMISSION_REVENUE 32 (balanced: 432 = 432).
        await postLedgerTransaction(adminPrisma, 'ORDER_SALE', [
            { accountId: codClearing.id, direction: 'DEBIT', amount: 400 },
            { accountId: payable.id, direction: 'CREDIT', amount: 400 },
            { accountId: payable.id, direction: 'DEBIT', amount: 32 },
            { accountId: commissionRevenue.id, direction: 'CREDIT', amount: 32 },
        ]);

        const outstanding = async () => {
            const rows = await adminPrisma.ledgerEntry.findMany({
                where: { account_id: payable.id, settlement_id: null },
            });
            return rows.reduce(
                (sum, r) => sum + (r.direction === 'CREDIT' ? 1 : -1) * Number(r.amount),
                0,
            );
        };
        expect(await outstanding()).toBe(368); // 400 - 32

        // Generate the settlement: tag both unsettled entries, post the payout.
        const settlement = await adminPrisma.settlement.create({
            data: {
                merchant_id: merchant.id,
                period_start: new Date('2026-11-01'),
                period_end: new Date('2026-11-07'),
                gross_amount: 400,
                commission_amount: 32,
                net_amount: 368,
            },
        });
        const unsettled = await adminPrisma.ledgerEntry.findMany({
            where: { account_id: payable.id, settlement_id: null },
        });
        await adminPrisma.$transaction([
            ...unsettled.map((e) =>
                adminPrisma.ledgerEntry.update({
                    where: { id: e.id },
                    data: { settlement_id: settlement.id },
                }),
            ),
        ]);
        await postLedgerTransaction(
            adminPrisma,
            'SETTLEMENT_PAYOUT',
            [
                {
                    accountId: payable.id,
                    direction: 'DEBIT',
                    amount: 368,
                    settlementId: settlement.id,
                },
                {
                    accountId: platformCash.id,
                    direction: 'CREDIT',
                    amount: 368,
                    settlementId: settlement.id,
                },
            ],
            { referenceType: 'SETTLEMENT', referenceId: settlement.id },
        );

        expect(await outstanding()).toBe(0);
    });

    it('a reversal posts new entries and never edits the original transaction', async () => {
        const { payable } = await createMerchantWithPayable();
        const codClearing = await platformAccount('COD_CASH_CLEARING');

        const originalId = await postLedgerTransaction(adminPrisma, 'ORDER_SALE', [
            { accountId: codClearing.id, direction: 'DEBIT', amount: 100 },
            { accountId: payable.id, direction: 'CREDIT', amount: 100 },
        ]);
        const originalEntriesBefore = await adminPrisma.ledgerEntry.findMany({
            where: { transaction_id: originalId },
        });

        await postLedgerTransaction(
            adminPrisma,
            'ADJUSTMENT',
            [
                { accountId: codClearing.id, direction: 'CREDIT', amount: 100 },
                { accountId: payable.id, direction: 'DEBIT', amount: 100 },
            ],
            { reversedTransactionId: originalId },
        );

        const originalEntriesAfter = await adminPrisma.ledgerEntry.findMany({
            where: { transaction_id: originalId },
        });
        expect(originalEntriesAfter).toEqual(originalEntriesBefore);

        const total = await adminPrisma.ledgerEntry.aggregate({
            where: { account_id: payable.id },
            _sum: { amount: true },
        });
        // +100 (credit) - 100 (debit) nets to zero once reversed - compute signed sum manually.
        const rows = await adminPrisma.ledgerEntry.findMany({ where: { account_id: payable.id } });
        const signed = rows.reduce(
            (sum, r) => sum + (r.direction === 'CREDIT' ? 1 : -1) * Number(r.amount),
            0,
        );
        expect(signed).toBe(0);
        expect(total._sum.amount?.toNumber()).toBe(200); // both entries remain, nothing deleted
    });

    it('the dropzo_app role cannot UPDATE or DELETE ledger_transactions/ledger_entries', async () => {
        const { payable } = await createMerchantWithPayable();
        const codClearing = await platformAccount('COD_CASH_CLEARING');
        const txId = await postLedgerTransaction(adminPrisma, 'ORDER_SALE', [
            { accountId: codClearing.id, direction: 'DEBIT', amount: 50 },
            { accountId: payable.id, direction: 'CREDIT', amount: 50 },
        ]);

        await expect(
            appPrisma.ledgerTransaction.update({
                where: { id: txId },
                data: { description: 'tampered' },
            }),
        ).rejects.toThrow();

        const entry = await adminPrisma.ledgerEntry.findFirstOrThrow({
            where: { transaction_id: txId },
        });
        await expect(appPrisma.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow();
    });
});
