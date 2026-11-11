import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

const Section = styled.section`
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
`;

const ActionRow = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const Button = styled.button`
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    background: #15803d;
    color: white;
    cursor: pointer;

    &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
    }
`;

const DangerButton = styled(Button)`
    background: #b91c1c;
`;

const Field = styled.input`
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #cbd5e1;
`;

const ErrorText = styled.p`
    color: #b91c1c;
`;

const SuccessText = styled.p`
    color: #15803d;
`;

export function MerchantOrderDetailPage() {
    const { storeId, orderId } = useParams<{ storeId: string; orderId: string }>();
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [pickupCode, setPickupCode] = useState('');
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

    const order = useQuery({
        queryKey: ['merchant-order', storeId, orderId],
        queryFn: () => apiClient.getMerchantOrder(storeId!, orderId!),
        enabled: !!storeId && !!orderId,
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['merchant-order', storeId, orderId] });
        queryClient.invalidateQueries({ queryKey: ['merchant-orders', storeId] });
    }

    const accept = useMutation({
        mutationFn: () => apiClient.acceptOrder(storeId!, orderId!),
        onSuccess: invalidate,
    });
    const reject = useMutation({
        mutationFn: (reason: string) => apiClient.rejectOrder(storeId!, orderId!, reason),
        onSuccess: () => {
            invalidate();
            setShowRejectForm(false);
        },
    });
    const markPreparing = useMutation({
        mutationFn: () => apiClient.markOrderPreparing(storeId!, orderId!),
        onSuccess: invalidate,
    });
    const markReady = useMutation({
        mutationFn: () => apiClient.markOrderReady(storeId!, orderId!),
        onSuccess: invalidate,
    });
    const verifyPickup = useMutation({
        mutationFn: (code: string) => apiClient.verifyPickupCode(storeId!, orderId!, code),
        onSuccess: (result) => {
            if (result.verified) {
                setVerifyMessage('Pickup verified — order completed.');
                invalidate();
            } else {
                setVerifyMessage(
                    `Incorrect code. ${result.attemptsRemaining} attempt(s) remaining.`,
                );
            }
        },
        onError: (err) => {
            setVerifyMessage(err instanceof ApiError ? err.message : 'Verification failed.');
        },
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
    const anyActionPending =
        accept.isPending || reject.isPending || markPreparing.isPending || markReady.isPending;

    return (
        <AppShell title={`Order ${data.order_number}`}>
            <Section>
                <p>
                    Status: <OrderStatusBadge status={data.status} />
                </p>
                <p>Total: ₹{data.total_amount}</p>
            </Section>

            {data.items && data.items.length > 0 && (
                <Section>
                    <h3>Items</h3>
                    <ul>
                        {data.items.map((item) => (
                            <li key={item.id}>
                                {item.product_name_snapshot} ({item.variant_snapshot}) ×{' '}
                                {item.quantity}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section>
                <h3>Actions</h3>
                {data.status === 'CREATED' && (
                    <ActionRow>
                        <Button disabled={anyActionPending} onClick={() => accept.mutate()}>
                            Accept
                        </Button>
                        <DangerButton
                            disabled={anyActionPending}
                            onClick={() => setShowRejectForm(true)}
                        >
                            Reject
                        </DangerButton>
                    </ActionRow>
                )}
                {showRejectForm && (
                    <ActionRow style={{ marginTop: '0.5rem' }}>
                        <Field
                            placeholder="Reason (required)"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <Button
                            disabled={rejectReason.length < 3 || reject.isPending}
                            onClick={() => reject.mutate(rejectReason)}
                        >
                            Confirm reject
                        </Button>
                    </ActionRow>
                )}
                {data.status === 'ACCEPTED' && (
                    <ActionRow>
                        <Button disabled={anyActionPending} onClick={() => markPreparing.mutate()}>
                            Mark preparing
                        </Button>
                    </ActionRow>
                )}
                {data.status === 'PREPARING' && (
                    <ActionRow>
                        <Button disabled={anyActionPending} onClick={() => markReady.mutate()}>
                            Mark ready for pickup
                        </Button>
                    </ActionRow>
                )}
                {data.status === 'READY' && (
                    <ActionRow>
                        <Field
                            placeholder="6-digit pickup code"
                            inputMode="numeric"
                            maxLength={6}
                            value={pickupCode}
                            onChange={(e) => setPickupCode(e.target.value)}
                        />
                        <Button
                            disabled={pickupCode.length !== 6 || verifyPickup.isPending}
                            onClick={() => verifyPickup.mutate(pickupCode)}
                        >
                            Verify and complete
                        </Button>
                    </ActionRow>
                )}
                {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(data.status) && (
                    <p>No further action is possible for this order.</p>
                )}
                {(accept.isError ||
                    reject.isError ||
                    markPreparing.isError ||
                    markReady.isError) && (
                    <ErrorText>Something went wrong. Please try again.</ErrorText>
                )}
                {verifyMessage && <SuccessText>{verifyMessage}</SuccessText>}
            </Section>

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
