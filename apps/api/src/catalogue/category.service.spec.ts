import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service.js';

function makeAudit() {
    return { record: jest.fn(async () => undefined) } as never;
}

function makePrisma(overrides: Record<string, unknown> = {}) {
    return {
        category: {
            findUnique: jest.fn(async () => ({ id: 'cat-1', name: 'Groceries' })),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'cat-new',
                ...args.data,
            })),
            update: jest.fn(async (args: { data: Record<string, unknown> }) => ({
                id: 'cat-1',
                ...args.data,
            })),
            findMany: jest.fn(async () => []),
            count: jest.fn(async () => 0),
            ...((overrides.category as object) ?? {}),
        },
    } as never;
}

describe('CategoryService', () => {
    describe('create', () => {
        it('creates a category and slugifies the name', async () => {
            const prisma = makePrisma();
            const service = new CategoryService(prisma, makeAudit());

            const result = await service.create('admin-1', { name: 'Rice & Pulses' });

            expect(result.slug).toBe('rice-pulses');
        });

        it('rejects when the parent category does not exist', async () => {
            const prisma = makePrisma({ category: { findUnique: jest.fn(async () => null) } });
            const service = new CategoryService(prisma, makeAudit());

            await expect(
                service.create('admin-1', { name: 'Basmati', parentId: 'missing' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('maps a unique-slug violation to a ConflictException', async () => {
            const prisma = makePrisma({
                category: {
                    create: jest.fn(async () => {
                        throw new Error('unique constraint');
                    }),
                },
            });
            const service = new CategoryService(prisma, makeAudit());

            await expect(service.create('admin-1', { name: 'Dairy' })).rejects.toThrow(
                ConflictException,
            );
        });
    });

    describe('update', () => {
        it('rejects a category being set as its own parent', async () => {
            const prisma = makePrisma();
            const service = new CategoryService(prisma, makeAudit());

            await expect(service.update('admin-1', 'cat-1', { parentId: 'cat-1' })).rejects.toThrow(
                ConflictException,
            );
        });

        it('rejects when the target category does not exist', async () => {
            const prisma = makePrisma({ category: { findUnique: jest.fn(async () => null) } });
            const service = new CategoryService(prisma, makeAudit());

            await expect(service.update('admin-1', 'missing', { name: 'X' })).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
