import { useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import type { OrderStatus } from '@dropzo/api-client';

const FilterBar = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
`;

const FilterButton = styled.button<{ $active: boolean }>`
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid #cbd5e1;
    background: ${(props) => (props.$active ? '#15803d' : 'white')};
    color: ${(props) => (props.$active ? 'white' : '#334155')};
    cursor: pointer;
    font-size: 0.8rem;
`;

const List = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
`;

const Row = styled.li`
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.75rem;

    a {
        text-decoration: none;
        color: inherit;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
`;

const STATUS_FILTERS: Array<OrderStatus | 'ALL'> = [
    'ALL',
    'CREATED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'REJECTED',
];

export function MerchantOrdersPage() {
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');

    const stores = useQuery({
        queryKey: ['merchant-stores'],
        queryFn: () => apiClient.listOwnStores({ page: 1, limit: 20 }),
    });
    const storeId = stores.data?.data[0]?.id;

    const orders = useQuery({
        queryKey: ['merchant-orders', storeId, statusFilter],
        queryFn: () =>
            apiClient.listMerchantOrders(storeId!, {
                page: 1,
                limit: 20,
                ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
            }),
        enabled: !!storeId,
    });

    if (stores.isLoading) {
        return (
            <AppShell title="Order inbox">
                <p>Loading your store…</p>
            </AppShell>
        );
    }
    if (!storeId) {
        return (
            <AppShell title="Order inbox">
                <p>You don&apos;t have a store yet.</p>
            </AppShell>
        );
    }

    return (
        <AppShell title={`Order inbox — ${stores.data?.data[0]?.name}`}>
            <FilterBar>
                {STATUS_FILTERS.map((status) => (
                    <FilterButton
                        key={status}
                        $active={statusFilter === status}
                        onClick={() => setStatusFilter(status)}
                    >
                        {status}
                    </FilterButton>
                ))}
            </FilterBar>

            {orders.isLoading && <p>Loading orders…</p>}
            {orders.isError && <p>Could not load orders.</p>}
            {orders.data && orders.data.data.length === 0 && <p>No orders here.</p>}
            <List>
                {orders.data?.data.map((order) => (
                    <Row key={order.id}>
                        <Link to={`/merchant/stores/${storeId}/orders/${order.id}`}>
                            <span>
                                {order.order_number}
                                <br />
                                <small>₹{order.total_amount}</small>
                            </span>
                            <OrderStatusBadge status={order.status} />
                        </Link>
                    </Row>
                ))}
            </List>
        </AppShell>
    );
}
