// Test-only helper for posting a ledger_transactions + ledger_entries group in one database
// transaction, matching DATABASE-DESIGN.md's "Financial accounting model". The balance check
// itself is NOT implemented here - that is exactly what the deferred constraint trigger in the
// migration enforces at commit time; this helper simply posts whatever entries it is given, so
// tests can prove the trigger (not application code) is what rejects an unbalanced set.
import type { Prisma, PrismaClient } from '@prisma/client';

export interface LedgerEntryInput {
    accountId: string;
    direction: 'DEBIT' | 'CREDIT';
    amount: number;
    settlementId?: string;
}

export async function postLedgerTransaction(
    prisma: PrismaClient,
    transactionType: string,
    entries: LedgerEntryInput[],
    options?: { referenceType?: string; referenceId?: string; reversedTransactionId?: string },
): Promise<string> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const transaction = await tx.ledgerTransaction.create({
            data: {
                transaction_type: transactionType,
                reference_type: options?.referenceType,
                reference_id: options?.referenceId,
                reversed_transaction_id: options?.reversedTransactionId,
            },
        });
        for (const entry of entries) {
            await tx.ledgerEntry.create({
                data: {
                    transaction_id: transaction.id,
                    account_id: entry.accountId,
                    direction: entry.direction,
                    amount: entry.amount,
                    settlement_id: entry.settlementId,
                },
            });
        }
        return transaction.id;
    });
}
