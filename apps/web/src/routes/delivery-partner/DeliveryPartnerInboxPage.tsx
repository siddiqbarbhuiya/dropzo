import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import {
    ActionRow,
    Button,
    DangerButton,
    Field,
    Section,
    SuccessText,
} from '../components/FormPrimitives';

/** A delivery partner's single-screen inbox: availability toggle, current assignment with its
 * accept/reject/collect/out-for-delivery/verify/fail actions, and outstanding COD balance. There
 * is at most one active assignment at a time (DB-enforced, see DELIVERY-MANAGEMENT-DESIGN.md), so
 * a single "current assignment" view is sufficient - no separate list screen needed. */
export function DeliveryPartnerInboxPage() {
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [failReason, setFailReason] = useState('');
    const [showFailForm, setShowFailForm] = useState(false);
    const [deliveryCode, setDeliveryCode] = useState('');
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

    const profile = useQuery({
        queryKey: ['delivery-partner-profile'],
        queryFn: () => apiClient.getOwnDeliveryProfile(),
    });
    const assignment = useQuery({
        queryKey: ['delivery-partner-current-assignment'],
        queryFn: () => apiClient.getOwnCurrentAssignment(),
        refetchInterval: 15_000,
    });
    const codSummary = useQuery({
        queryKey: ['delivery-partner-cod-summary'],
        queryFn: () => apiClient.getOwnCodSummary(),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['delivery-partner-current-assignment'] });
        queryClient.invalidateQueries({ queryKey: ['delivery-partner-cod-summary'] });
    }

    const orderId = assignment.data?.order_id;
    const setAvailability = useMutation({
        mutationFn: (isAvailable: boolean) => apiClient.setOwnAvailability(isAvailable),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-partner-profile'] }),
    });
    const accept = useMutation({
        mutationFn: () => apiClient.acceptAssignment(orderId!),
        onSuccess: invalidate,
    });
    const reject = useMutation({
        mutationFn: (reason: string) => apiClient.rejectAssignment(orderId!, reason),
        onSuccess: () => {
            setShowRejectForm(false);
            invalidate();
        },
    });
    const collect = useMutation({
        mutationFn: () => apiClient.collectAssignment(orderId!),
        onSuccess: invalidate,
    });
    const outForDelivery = useMutation({
        mutationFn: () => apiClient.markOutForDelivery(orderId!),
        onSuccess: invalidate,
    });
    const verifyDelivery = useMutation({
        mutationFn: (code: string) => apiClient.verifyDeliveryCode(orderId!, code),
        onSuccess: (result) => {
            if (result.verified) {
                setVerifyMessage('Delivery verified — order completed.');
                invalidate();
            } else {
                setVerifyMessage(
                    `Incorrect code. ${result.attemptsRemaining} attempt(s) remaining.`,
                );
            }
        },
        onError: (err) =>
            setVerifyMessage(err instanceof ApiError ? err.message : 'Verification failed.'),
    });
    const reportFailure = useMutation({
        mutationFn: (reason: string) => apiClient.reportDeliveryFailure(orderId!, reason),
        onSuccess: () => {
            setShowFailForm(false);
            invalidate();
        },
    });

    return (
        <AppShell title="Delivery inbox">
            <Section>
                <h3>Your profile</h3>
                {profile.isLoading && <p>Loading…</p>}
                {profile.data && (
                    <>
                        <p>Status: {profile.data.is_approved ? 'Active' : 'Inactive'}</p>
                        <ActionRow>
                            <Button
                                disabled={!profile.data.is_approved || setAvailability.isPending}
                                onClick={() => setAvailability.mutate(!profile.data!.is_available)}
                            >
                                {profile.data.is_available ? 'Go offline' : 'Go online'}
                            </Button>
                        </ActionRow>
                    </>
                )}
            </Section>

            <Section>
                <h3>Current assignment</h3>
                {assignment.isLoading && <p>Loading…</p>}
                {!assignment.isLoading && !assignment.data && (
                    <p>No active assignment right now.</p>
                )}
                {assignment.data && (
                    <>
                        <p>
                            Order status:{' '}
                            <OrderStatusBadge status={assignment.data.delivery_status} />
                        </p>
                        {assignment.data.delivery_status === 'ASSIGNED' && (
                            <ActionRow>
                                <Button disabled={accept.isPending} onClick={() => accept.mutate()}>
                                    Accept
                                </Button>
                                <DangerButton
                                    disabled={reject.isPending}
                                    onClick={() => setShowRejectForm(true)}
                                >
                                    Reject
                                </DangerButton>
                            </ActionRow>
                        )}
                        {showRejectForm && (
                            <ActionRow>
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
                        {assignment.data.delivery_status === 'ACCEPTED' && (
                            <ActionRow>
                                <Button
                                    disabled={collect.isPending}
                                    onClick={() => collect.mutate()}
                                >
                                    Confirm collected from store
                                </Button>
                            </ActionRow>
                        )}
                        {assignment.data.delivery_status === 'PICKED_UP' && (
                            <ActionRow>
                                <Button
                                    disabled={outForDelivery.isPending}
                                    onClick={() => outForDelivery.mutate()}
                                >
                                    Mark out for delivery
                                </Button>
                            </ActionRow>
                        )}
                        {assignment.data.delivery_status === 'OUT_FOR_DELIVERY' && (
                            <>
                                <ActionRow>
                                    <Field
                                        placeholder="6-digit delivery code"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={deliveryCode}
                                        onChange={(e) => setDeliveryCode(e.target.value)}
                                    />
                                    <Button
                                        disabled={
                                            deliveryCode.length !== 6 || verifyDelivery.isPending
                                        }
                                        onClick={() => verifyDelivery.mutate(deliveryCode)}
                                    >
                                        Verify and complete
                                    </Button>
                                    <DangerButton onClick={() => setShowFailForm(true)}>
                                        Report failed delivery
                                    </DangerButton>
                                </ActionRow>
                                {showFailForm && (
                                    <ActionRow>
                                        <Field
                                            placeholder="Reason (required)"
                                            value={failReason}
                                            onChange={(e) => setFailReason(e.target.value)}
                                        />
                                        <Button
                                            disabled={
                                                failReason.length < 3 || reportFailure.isPending
                                            }
                                            onClick={() => reportFailure.mutate(failReason)}
                                        >
                                            Confirm failure
                                        </Button>
                                    </ActionRow>
                                )}
                                {verifyMessage && <SuccessText>{verifyMessage}</SuccessText>}
                            </>
                        )}
                    </>
                )}
            </Section>

            <Section>
                <h3>COD cash in custody</h3>
                {codSummary.data && <p>₹{codSummary.data.outstandingBalance}</p>}
            </Section>
        </AppShell>
    );
}
