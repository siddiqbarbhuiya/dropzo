import { jest } from '@jest/globals';
import { PublicStoreController } from './public-store.controller.js';
import type { StoreService } from './store.service.js';
import type { StoreProductService } from '../inventory/store-product.service.js';

describe('PublicStoreController', () => {
    let controller: PublicStoreController;
    let storeService: jest.Mocked<Partial<StoreService>>;
    let storeProductService: jest.Mocked<Partial<StoreProductService>>;

    beforeEach(() => {
        storeService = {
            listPublicStores: jest.fn(async () => ({
                data: [
                    {
                        id: 'store-1',
                        name: 'Maa Tara Groceries',
                        address: 'Station Road',
                        district: 'Sribhumi',
                        city: 'Badarpur',
                        supports_pickup: true,
                        supports_delivery: true,
                        is_open: true,
                    },
                ],
                meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
            })) as never,
            getPublicStore: jest.fn(async (storeId: string) => ({
                id: storeId,
                name: 'Maa Tara Groceries',
                address: 'Station Road',
                district: 'Sribhumi',
                city: 'Badarpur',
                supports_pickup: true,
                supports_delivery: true,
                is_open: true,
            })) as never,
        };

        storeProductService = {
            listPublicStoreProducts: jest.fn(async (storeId: string) => ({
                data: [
                    {
                        id: 'listing-1',
                        store_id: storeId,
                        product_id: 'prod-1',
                        product_name: 'Aashirvaad Atta',
                        variant_id: 'var-1',
                        variant_name: '5kg',
                        selling_price: 180,
                        mrp: 200,
                        in_stock: true,
                        low_stock: false,
                    },
                ],
                meta: { page: 1, limit: 30, total: 1, totalPages: 1 },
            })) as never,
        };

        controller = new PublicStoreController(
            storeService as StoreService,
            storeProductService as StoreProductService,
        );
    });

    it('GET /api/v1/stores lists active stores', async () => {
        const result = await controller.list({ page: 1, limit: 20 });
        expect(storeService.listPublicStores).toHaveBeenCalledWith({ page: 1, limit: 20 });
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe('Maa Tara Groceries');
    });

    it('GET /api/v1/stores/:storeId retrieves store details', async () => {
        const result = await controller.getOne('store-1');
        expect(storeService.getPublicStore).toHaveBeenCalledWith('store-1');
        expect(result.id).toBe('store-1');
    });

    it('GET /api/v1/stores/:storeId/products retrieves store catalogue', async () => {
        const result = await controller.listProducts('store-1', { page: 1, limit: 30 });
        expect(storeProductService.listPublicStoreProducts).toHaveBeenCalledWith('store-1', {
            page: 1,
            limit: 30,
        });
        expect(result.data).toHaveLength(1);
        expect(result.data[0].selling_price).toBe(180);
    });
});
