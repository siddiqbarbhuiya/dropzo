import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { Card, ErrorState, EmptyState, Skeleton } from '../../components/ui';
import { typeScale } from '../../theme';

const List = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
`;

const Row = styled(Card)`
    a {
        text-decoration: none;
        color: inherit;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
`;

const OrderNumber = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.textPrimary};
    display: block;
`;

const Amount = styled.span`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

export function CustomerOrdersPage() {
    const orders = useQuery({
        queryKey: ['customer-orders'],
        queryFn: () => apiClient.listOwnOrders({ page: 1, limit: 20 }),
    });

    return (
        <AppShell title="My orders">
            {orders.isLoading && (
                <List>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} $height="4rem" />
                    ))}
                </List>
            )}
            {orders.isError && <ErrorState description="Could not load your orders." />}
            {orders.data && orders.data.data.length === 0 && (
                <EmptyState
                    title="No orders yet"
                    description="Orders you place will show up here."
                />
            )}
            {orders.data && orders.data.data.length > 0 && (
                <List>
                    {orders.data.data.map((order) => (
                        <Row key={order.id}>
                            <Link to={`/orders/${order.id}`}>
                                <span>
                                    <OrderNumber>{order.order_number}</OrderNumber>
                                    <Amount>₹{order.total_amount}</Amount>
                                </span>
                                <OrderStatusBadge status={order.status} />
                            </Link>
                        </Row>
                    ))}
                </List>
            )}
        </AppShell>
    );
}
