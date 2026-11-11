import { jest } from '@jest/globals';
import { LedgerService } from './ledger.service.js';

function makeOrder(overrides: Record<string, unknown> = {}) {
    return { id: 'order-1', order_number: 'DZ1', total_amount: 100, delivery_fee: 0, ...overrides };
}

function makeMerchant(overrides: Record<string, unknown> = {}) {
    return { id: 'merchant-1', commission_percent: 8, ...overrides };
}

function makeTx() {
    const financialAccount = {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(
            async (args: { where: { account_type: string; merchant_id: string | null } }) => {
                void args;
                return null;
            },
        ),
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: `account-${args.data.account_type}`,
            ...args.data,
        })),
    };
    const ledgerTransaction = {
        create: jest.fn(async () => ({ id: 'txn-1' })),
    };
    const ledgerEntry = {
        createMany: jest.fn(async (args: { data: unknown[] }) => {
            void args;
            return { count: 0 };
        }),
    };
    return { financialAccount, ledgerTransaction, ledgerEntry };
}

describe('LedgerService', () => {
    it('posts a balanced transaction: gross to COD clearing/merchant payable, commission to platform revenue', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postCodCollection(tx as never, makeOrder() as never, makeMerchant() as never);

        expect(tx.ledgerTransaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    transaction_type: 'ORDER_SALE_COD',
                    reference_type: 'ORDER',
                    reference_id: 'order-1',
                }),
            }),
        );
        const entries = (tx.ledgerEntry.createMany.mock.calls[0]![0] as { data: unknown[] })
            .data as Array<{
            direction: string;
            amount: number;
            account_id: string;
        }>;
        const totalDebits = entries
            .filter((e) => e.direction === 'DEBIT')
            .reduce((s, e) => s + e.amount, 0);
        const totalCredits = entries
            .filter((e) => e.direction === 'CREDIT')
            .reduce((s, e) => s + e.amount, 0);
        expect(totalDebits).toBe(totalCredits);
        expect(totalDebits).toBe(108); // 100 gross + 8 commission (8% of 100)
    });

    it('creates the merchant payable account when one does not exist yet', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postCodCollection(tx as never, makeOrder() as never, makeMerchant() as never);

        expect(tx.financialAccount.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    account_type: 'MERCHANT_PAYABLE',
                    merchant_id: 'merchant-1',
                }),
            }),
        );
    });

    it('reuses an existing platform account instead of creating a duplicate', async () => {
        const tx = makeTx();
        tx.financialAccount.findFirst = jest.fn(
            async (args: { where: { account_type: string } }) =>
                args.where.account_type === 'COD_CASH_CLEARING'
                    ? { id: 'existing-cod-account' }
                    : null,
        ) as never;
        const service = new LedgerService({} as never);

        await service.postCodCollection(tx as never, makeOrder() as never, makeMerchant() as never);

        const createCalls = tx.financialAccount.create.mock.calls.map(
            (c) => (c[0] as { data: { account_type: string } }).data.account_type,
        );
        expect(createCalls).not.toContain('COD_CASH_CLEARING');
    });

    it('omits the commission leg entirely when commission is zero', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postCodCollection(
            tx as never,
            makeOrder() as never,
            makeMerchant({ commission_percent: 0 }) as never,
        );

        const entries = (tx.ledgerEntry.createMany.mock.calls[0]![0] as { data: unknown[] }).data;
        expect(entries).toHaveLength(2);
    });
});

describe('LedgerService.postDeliveryCodCollection (BC-010)', () => {
    it('posts a balanced transaction: merchandise, delivery-fee, and commission legs', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postDeliveryCodCollection(
            tx as never,
            makeOrder({ total_amount: 125, delivery_fee: 25 }) as never,
            makeMerchant() as never,
        );

        expect(tx.ledgerTransaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ transaction_type: 'ORDER_SALE_COD_DELIVERY' }),
            }),
        );
        const entries = (tx.ledgerEntry.createMany.mock.calls[0]![0] as { data: unknown[] })
            .data as Array<{ direction: string; amount: number; account_id: string }>;
        const totalDebits = entries
            .filter((e) => e.direction === 'DEBIT')
            .reduce((s, e) => s + e.amount, 0);
        const totalCredits = entries
            .filter((e) => e.direction === 'CREDIT')
            .reduce((s, e) => s + e.amount, 0);
        expect(totalDebits).toBe(totalCredits);
        // gross 125 debited to COD clearing; merchandise 100 credited to merchant payable, delivery
        // fee 25 credited to platform delivery revenue, commission 8% of the 100 merchandise (8)
        // debited from merchant payable / credited to platform commission revenue.
        expect(totalDebits).toBe(133);

        const deliveryRevenueEntry = entries.find(
            (e) => e.account_id === 'account-PLATFORM_DELIVERY_REVENUE',
        );
        expect(deliveryRevenueEntry).toMatchObject({ direction: 'CREDIT', amount: 25 });
    });

    it('never commissions the delivery fee, only the merchandise amount', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postDeliveryCodCollection(
            tx as never,
            makeOrder({ total_amount: 125, delivery_fee: 25 }) as never,
            makeMerchant({ commission_percent: 10 }) as never,
        );

        const entries = (tx.ledgerEntry.createMany.mock.calls[0]![0] as { data: unknown[] })
            .data as Array<{ direction: string; amount: number; account_id: string }>;
        const commissionEntry = entries.find(
            (e) => e.account_id === 'account-PLATFORM_COMMISSION_REVENUE',
        );
        expect(commissionEntry).toMatchObject({ direction: 'CREDIT', amount: 10 }); // 10% of 100, not 125
    });

    it('omits the delivery-fee leg entirely when there is no delivery fee', async () => {
        const tx = makeTx();
        const service = new LedgerService({} as never);

        await service.postDeliveryCodCollection(
            tx as never,
            makeOrder({ total_amount: 100, delivery_fee: 0 }) as never,
            makeMerchant() as never,
        );

        const entries = (tx.ledgerEntry.createMany.mock.calls[0]![0] as { data: unknown[] }).data;
        expect(entries).toHaveLength(4); // same two legs as plain COD - no delivery-revenue entry
    });
});
