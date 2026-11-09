import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
    const product = {
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'prod-1',
            ...args.data,
        })),
        update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'prod-1',
            ...args.data,
        })),
        findUnique: jest.fn(async () => ({ id: 'prod-1', name: 'Basmati Rice', variants: [] })),
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        ...((overrides.product as object) ?? {}),
    };
    const productVariant = {
        create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'variant-1',
            ...args.data,
        })),
        update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
            id: 'variant-1',
            ...args.data,
        })),
        findFirst: jest.fn(async () => ({ id: 'variant-1', product_id: 'prod-1' })),
        ...((overrides.productVariant as object) ?? {}),
    };
    return {
        product,
        productVariant,
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
            fn({ product, productVariant }),
        ),
    } as never;
}

describe('ProductService', () => {
    describe('create', () => {
        it('creates a product with its initial variants in one transaction', async () => {
            const prisma = makePrisma();
            const service = new ProductService(prisma, makeAudit());

            const result = await service.create('admin-1', {
                name: 'Basmati Rice',
                variants: [{ variantName: '1kg pack', unit: 'kg', packSize: 1 }],
            });

            expect(result.id).toBe('prod-1');
            expect(
                (prisma as never as { productVariant: { create: jest.Mock } }).productVariant
                    .create,
            ).toHaveBeenCalled();
        });
    });

    describe('addVariant', () => {
        it('rejects when the product does not exist', async () => {
            const prisma = makePrisma({ product: { findUnique: jest.fn(async () => null) } });
            const service = new ProductService(prisma, makeAudit());

            await expect(
                service.addVariant('admin-1', 'missing', { variantName: '5kg pack', unit: 'kg' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('maps a unique-SKU violation to a ConflictException', async () => {
            const prisma = makePrisma({
                productVariant: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                },
            });
            const service = new ProductService(prisma, makeAudit());

            await expect(
                service.addVariant('admin-1', 'prod-1', {
                    variantName: '10kg pack',
                    unit: 'kg',
                    sku: 'DUP-SKU',
                }),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getVariantOrThrow', () => {
        it('never trusts a variantId without checking it belongs to the product', async () => {
            const prisma = makePrisma({
                productVariant: { findFirst: jest.fn(async () => null) },
            });
            const service = new ProductService(prisma, makeAudit());

            await expect(
                service.getVariantOrThrow('prod-1', 'variant-from-another-product'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
