import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

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

export function CustomerOrdersPage() {
    const orders = useQuery({
        queryKey: ['customer-orders'],
        queryFn: () => apiClient.listOwnOrders({ page: 1, limit: 20 }),
    });

    return (
        <AppShell title="My orders">
            {orders.isLoading && <p>Loading orders…</p>}
            {orders.isError && <p>Could not load your orders.</p>}
            {orders.data && orders.data.data.length === 0 && <p>No orders yet.</p>}
            <List>
                {orders.data?.data.map((order) => (
                    <Row key={order.id}>
                        <Link to={`/orders/${order.id}`}>
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
