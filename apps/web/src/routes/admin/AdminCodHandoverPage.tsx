import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import { ActionRow, Button, ErrorText, Section, SuccessText } from '../components/FormPrimitives';

const List = styled.ul`
    list-style: none;
    padding: 0;
    margin: 0;
`;

const Row = styled.li`
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
`;

/** Admin view of one delivery partner's outstanding COD cash-in-custody balance, and recording a
 * cash handover for a chosen set of already-collected orders. Balance is always derived from
 * DeliveryCodService - never an editable frontend total. */
export function AdminCodHandoverPage() {
    const { partnerId } = useParams<{ partnerId: string }>();
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [handoverError, setHandoverError] = useState<string | null>(null);
    const [handoverSuccess, setHandoverSuccess] = useState(false);

    const summary = useQuery({
        queryKey: ['admin-partner-cod-summary', partnerId],
        queryFn: () => apiClient.getDeliveryPartnerCodSummary(partnerId!),
        enabled: !!partnerId,
    });
    const handovers = useQuery({
        queryKey: ['admin-partner-cod-handovers', partnerId],
        queryFn: () => apiClient.listDeliveryPartnerHandovers(partnerId!, { page: 1, limit: 20 }),
        enabled: !!partnerId,
    });

    const recordHandover = useMutation({
        mutationFn: () => apiClient.recordCodHandover(partnerId!, Array.from(selected)),
        onSuccess: () => {
            setSelected(new Set());
            setHandoverError(null);
            setHandoverSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['admin-partner-cod-summary', partnerId] });
            queryClient.invalidateQueries({ queryKey: ['admin-partner-cod-handovers', partnerId] });
        },
        onError: (err) => {
            setHandoverSuccess(false);
            setHandoverError(err instanceof ApiError ? err.message : 'Could not record handover.');
        },
    });

    function toggle(orderId: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    }

    return (
        <AppShell title="COD cash handover">
            <Section>
                <h3>Outstanding balance</h3>
                {summary.isLoading && <p>Loading…</p>}
                {summary.data && <p>₹{summary.data.outstandingBalance}</p>}
                <List>
                    {summary.data?.uncollectedAssignments.map((item) => (
                        <Row key={item.orderId}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={selected.has(item.orderId)}
                                    onChange={() => toggle(item.orderId)}
                                />{' '}
                                Order {item.orderId} — ₹{item.amount}
                            </label>
                        </Row>
                    ))}
                </List>
                <ActionRow>
                    <Button
                        disabled={selected.size === 0 || recordHandover.isPending}
                        onClick={() => recordHandover.mutate()}
                    >
                        Record handover for {selected.size} order(s)
                    </Button>
                </ActionRow>
                {handoverError && <ErrorText>{handoverError}</ErrorText>}
                {handoverSuccess && <SuccessText>Handover recorded.</SuccessText>}
            </Section>

            <Section>
                <h3>Handover history</h3>
                {handovers.data && handovers.data.data.length === 0 && (
                    <p>No handovers recorded yet.</p>
                )}
                <List>
                    {handovers.data?.data.map((h) => (
                        <Row key={h.id}>
                            <span>
                                ₹{h.amount} — {new Date(h.created_at).toLocaleString()}
                            </span>
                        </Row>
                    ))}
                </List>
            </Section>
        </AppShell>
    );
}
