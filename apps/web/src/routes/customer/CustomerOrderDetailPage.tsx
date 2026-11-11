import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { ErrorText } from '../components/FormPrimitives';

const Section = styled.section`
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
`;

const CodeBox = styled.div`
    text-align: center;
    padding: 1rem;
    border: 2px dashed #15803d;
    border-radius: 0.5rem;
    margin-top: 0.75rem;
`;

const CodeDigits = styled.p`
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.3rem;
    margin: 0.25rem 0;
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
                <p>Loading…</p>
            </AppShell>
        );
    }
    if (order.isError || !order.data) {
        return (
            <AppShell title="Order detail">
                <p>Could not load this order.</p>
            </AppShell>
        );
    }

    const data = order.data;

    return (
        <AppShell title={`Order ${data.order_number}`}>
            <Section>
                <p>
                    Status: <OrderStatusBadge status={data.status} />
                </p>
                <p>Total: ₹{data.total_amount}</p>
                <p>Fulfilment: {data.fulfilment_type}</p>
            </Section>

            {data.items && data.items.length > 0 && (
                <Section>
                    <h3>Items</h3>
                    <ul>
                        {data.items.map((item) => (
                            <li key={item.id}>
                                {item.product_name_snapshot} ({item.variant_snapshot}) ×{' '}
                                {item.quantity} — ₹{item.unit_price}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {isDelivery && (
                <Section>
                    <h3>Delivery progress</h3>
                    {deliveryStatus.isLoading && <p>Loading delivery progress…</p>}
                    {deliveryStatus.data?.assignment ? (
                        <>
                            <p>Delivery status: {deliveryStatus.data.assignment.deliveryStatus}</p>
                            {deliveryStatus.data.assignment.partnerName && (
                                <p>
                                    Delivery partner: {deliveryStatus.data.assignment.partnerName} (
                                    {deliveryStatus.data.assignment.partnerPhone})
                                </p>
                            )}
                        </>
                    ) : (
                        <p>Waiting for a delivery partner to be assigned.</p>
                    )}
                    {data.status === 'DELIVERY_FAILED' && (
                        <ErrorText>
                            Delivery was unsuccessful. Our support team will contact you shortly.
                        </ErrorText>
                    )}
                    {data.status === 'OUT_FOR_DELIVERY' && (
                        <>
                            {deliveryCode.isLoading && <p>Loading your delivery code…</p>}
                            {deliveryCode.data?.codeAvailable && deliveryCode.data.code && (
                                <CodeBox>
                                    <p>
                                        Share this code with the delivery partner only after you
                                        receive your order:
                                    </p>
                                    <CodeDigits>{deliveryCode.data.code}</CodeDigits>
                                    <small>
                                        Expires{' '}
                                        {new Date(deliveryCode.data.expiresAt).toLocaleString()}
                                    </small>
                                </CodeBox>
                            )}
                            {deliveryCode.data && !deliveryCode.data.codeAvailable && (
                                <p>
                                    Your code was already generated but can&apos;t be shown again
                                    here. Please contact support for help.
                                </p>
                            )}
                        </>
                    )}
                </Section>
            )}

            {data.status === 'READY' && data.fulfilment_type === 'PICKUP' && (
                <Section>
                    <h3>Pickup code</h3>
                    {pickupCode.isLoading && <p>Loading your code…</p>}
                    {pickupCode.isError && (
                        <p>
                            {pickupCode.error instanceof ApiError
                                ? pickupCode.error.message
                                : 'Could not load your pickup code.'}
                        </p>
                    )}
                    {pickupCode.data?.codeAvailable && pickupCode.data.code && (
                        <CodeBox>
                            <p>Show this code to the store to collect your order:</p>
                            <CodeDigits>{pickupCode.data.code}</CodeDigits>
                            <small>
                                Expires {new Date(pickupCode.data.expiresAt).toLocaleString()}
                            </small>
                        </CodeBox>
                    )}
                    {pickupCode.data && !pickupCode.data.codeAvailable && (
                        <p>
                            Your code was already generated but can&apos;t be shown again here.
                            Please contact the store for help.
                        </p>
                    )}
                </Section>
            )}

            {data.status_history && data.status_history.length > 0 && (
                <Section>
                    <h3>History</h3>
                    <ul>
                        {data.status_history.map((entry) => (
                            <li key={entry.id}>
                                {entry.old_status ?? '—'} → {entry.new_status}
                                {entry.reason ? ` (${entry.reason})` : ''} —{' '}
                                {new Date(entry.created_at).toLocaleString()}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </AppShell>
    );
}
