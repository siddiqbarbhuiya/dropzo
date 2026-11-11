import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { Card, LoadingState, ErrorState } from '../../components/ui';
import { OrderStatusStepper, PickupPinCard } from '../../components/domain';
import { typeScale } from '../../theme';

const Section = styled(Card)`
    margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MetaRow = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const ItemList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
`;

const HistoryList = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

export function CustomerOrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>();

    const order = useQuery({
        queryKey: ['customer-order', orderId],
        queryFn: () => apiClient.getOwnOrder(orderId!),
        enabled: !!orderId,
    });

    const pickupCode = useQuery({
        queryKey: ['customer-pickup-code', orderId],
        queryFn: () => apiClient.getOwnPickupCode(orderId!),
        enabled:
            !!orderId && order.data?.status === 'READY' && order.data.fulfilment_type === 'PICKUP',
        retry: false,
    });

    const isDelivery = order.data?.fulfilment_type === 'DELIVERY';
    const deliveryStatus = useQuery({
        queryKey: ['customer-delivery-status', orderId],
        queryFn: () => apiClient.getOwnDeliveryStatus(orderId!),
        enabled: !!orderId && isDelivery,
        // Delivery status changes are partner-driven, out-of-band - unlike the pickup code, this
        // is worth polling so the customer sees progress without manually refreshing.
        refetchInterval: 15_000,
    });
    const deliveryCode = useQuery({
        queryKey: ['customer-delivery-code', orderId],
        queryFn: () => apiClient.getOwnDeliveryCode(orderId!),
        enabled: !!orderId && order.data?.status === 'OUT_FOR_DELIVERY',
        retry: false,
    });

    if (order.isLoading) {
        return (
            <AppShell title="Order detail">
                <LoadingState label="Loading order" />
            </AppShell>
        );
    }
    if (order.isError || !order.data) {
        return (
            <AppShell title="Order detail">
                <ErrorState description="Could not load this order." />
            </AppShell>
        );
    }

    const data = order.data;

    return (
        <AppShell title={`Order ${data.order_number}`}>
            <Section>
                <MetaRow>
                    Status: <OrderStatusBadge status={data.status} />
                </MetaRow>
                <MetaRow>Total: ₹{data.total_amount}</MetaRow>
                <MetaRow>Fulfilment: {data.fulfilment_type}</MetaRow>
                <div style={{ marginTop: '1rem' }}>
                    <OrderStatusStepper status={data.status} />
                </div>
            </Section>

            {data.items && data.items.length > 0 && (
                <Section>
                    <SectionTitle>Items</SectionTitle>
                    <ItemList>
                        {data.items.map((item) => (
                            <li key={item.id}>
                                {item.product_name_snapshot} ({item.variant_snapshot}) ×{' '}
                                {item.quantity} — ₹{item.unit_price}
                            </li>
                        ))}
                    </ItemList>
                </Section>
            )}

            {isDelivery && (
                <Section>
                    <SectionTitle>Delivery progress</SectionTitle>
                    {deliveryStatus.isLoading && <LoadingState label="Loading delivery progress" />}
                    {deliveryStatus.data?.assignment ? (
                        <>
                            <MetaRow>
                                Delivery status: {deliveryStatus.data.assignment.deliveryStatus}
                            </MetaRow>
                            {deliveryStatus.data.assignment.partnerName && (
                                <MetaRow>
                                    Delivery partner: {deliveryStatus.data.assignment.partnerName} (
                                    {deliveryStatus.data.assignment.partnerPhone})
                                </MetaRow>
                            )}
                        </>
                    ) : (
                        <MetaRow>Waiting for a delivery partner to be assigned.</MetaRow>
                    )}
                    {data.status === 'DELIVERY_FAILED' && (
                        <ErrorState
                            title="Delivery unsuccessful"
                            description="Our support team will contact you shortly."
                        />
                    )}
                    {data.status === 'OUT_FOR_DELIVERY' && (
                        <>
                            {deliveryCode.isLoading && (
                                <LoadingState label="Loading your delivery code" />
                            )}
                            {deliveryCode.data?.codeAvailable && deliveryCode.data.code && (
                                <PickupPinCard
                                    code={deliveryCode.data.code}
                                    expiresAt={deliveryCode.data.expiresAt}
                                    helperText="Share this code with the delivery partner only after you receive your order."
                                />
                            )}
                            {deliveryCode.data && !deliveryCode.data.codeAvailable && (
                                <MetaRow>
                                    Your code was already generated but can&apos;t be shown again
                                    here. Please contact support for help.
                                </MetaRow>
                            )}
                        </>
                    )}
                </Section>
            )}

            {data.status === 'READY' && data.fulfilment_type === 'PICKUP' && (
                <Section>
                    <SectionTitle>Pickup code</SectionTitle>
                    {pickupCode.isLoading && <LoadingState label="Loading your code" />}
                    {pickupCode.isError && (
                        <ErrorState
                            description={
                                pickupCode.error instanceof ApiError
                                    ? pickupCode.error.message
                                    : 'Could not load your pickup code.'
                            }
                        />
                    )}
                    {pickupCode.data?.codeAvailable && pickupCode.data.code && (
                        <PickupPinCard
                            code={pickupCode.data.code}
                            expiresAt={pickupCode.data.expiresAt}
                            helperText="Show this code to the store to collect your order."
                        />
                    )}
                    {pickupCode.data && !pickupCode.data.codeAvailable && (
                        <MetaRow>
                            Your code was already generated but can&apos;t be shown again here.
                            Please contact the store for help.
                        </MetaRow>
                    )}
                </Section>
            )}

            {data.status_history && data.status_history.length > 0 && (
                <Section>
                    <SectionTitle>History</SectionTitle>
                    <HistoryList>
                        {data.status_history.map((entry) => (
                            <li key={entry.id}>
                                {entry.old_status ?? '—'} → {entry.new_status}
                                {entry.reason ? ` (${entry.reason})` : ''} —{' '}
                                {new Date(entry.created_at).toLocaleString()}
                            </li>
                        ))}
                    </HistoryList>
                </Section>
            )}
        </AppShell>
    );
}
