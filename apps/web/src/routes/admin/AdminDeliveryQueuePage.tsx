import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { ActionRow, Button, ErrorText, Select } from '../components/FormPrimitives';

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
`;

/** HOME_DELIVERY orders currently READY (never assigned, or returned to the queue after a
 * rejection/cancellation) or DELIVERY_FAILED (awaiting reassignment) - see
 * DeliveryAssignmentService.listEligibleOrders. Manual assignment only, per ADR-0010. */
export function AdminDeliveryQueuePage() {
    const queryClient = useQueryClient();
    const [selectedPartner, setSelectedPartner] = useState<Record<string, string>>({});
    const [assignError, setAssignError] = useState<string | null>(null);

    const orders = useQuery({
        queryKey: ['admin-eligible-delivery-orders'],
        queryFn: () => apiClient.listEligibleDeliveryOrders({ page: 1, limit: 50 }),
    });
    const activePartners = useQuery({
        queryKey: ['admin-delivery-partners', 'active'],
        queryFn: () => apiClient.listDeliveryPartners({ isActive: true, page: 1, limit: 100 }),
    });

    const assign = useMutation({
        mutationFn: ({ orderId, partnerId }: { orderId: string; partnerId: string }) =>
            apiClient.assignDelivery(orderId, partnerId),
        onSuccess: () => {
            setAssignError(null);
            queryClient.invalidateQueries({ queryKey: ['admin-eligible-delivery-orders'] });
        },
        onError: (err) =>
            setAssignError(err instanceof ApiError ? err.message : 'Could not assign.'),
    });

    return (
        <AppShell title="Delivery assignment queue">
            {orders.isLoading && <p>Loading…</p>}
            {orders.isError && <p>Could not load eligible orders.</p>}
            {orders.data && orders.data.data.length === 0 && <p>No orders awaiting assignment.</p>}
            {assignError && <ErrorText>{assignError}</ErrorText>}
            <List>
                {orders.data?.data.map((order) => (
                    <Row key={order.id}>
                        <p>
                            {order.order_number} — ₹{order.total_amount}{' '}
                            <OrderStatusBadge status={order.status} />
                        </p>
                        <ActionRow>
                            <Select
                                value={selectedPartner[order.id] ?? ''}
                                onChange={(e) =>
                                    setSelectedPartner((prev) => ({
                                        ...prev,
                                        [order.id]: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Select a partner…</option>
                                {activePartners.data?.data.map((partner) => (
                                    <option key={partner.id} value={partner.id}>
                                        {partner.user.full_name ?? partner.user.phone}
                                    </option>
                                ))}
                            </Select>
                            <Button
                                disabled={!selectedPartner[order.id] || assign.isPending}
                                onClick={() =>
                                    assign.mutate({
                                        orderId: order.id,
                                        partnerId: selectedPartner[order.id]!,
                                    })
                                }
                            >
                                {order.status === 'DELIVERY_FAILED' ? 'Reassign' : 'Assign'}
                            </Button>
                        </ActionRow>
                    </Row>
                ))}
            </List>
        </AppShell>
    );
}
