import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { AppShell } from '../layout/AppShell';
import {
    ActionRow,
    Button,
    DangerButton,
    ErrorText,
    Field,
    Section,
} from '../components/FormPrimitives';

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
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

/** First admin screen in the web app: onboard an existing user as a delivery partner, and
 * activate/deactivate them. No KYC/document upload - the user must already exist (registered via
 * ordinary OTP login); admin only grants the role and creates the profile. */
export function AdminDeliveryPartnersPage() {
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);

    const partners = useQuery({
        queryKey: ['admin-delivery-partners'],
        queryFn: () => apiClient.listDeliveryPartners({ page: 1, limit: 50 }),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners'] });
    }

    const create = useMutation({
        mutationFn: () =>
            apiClient.createDeliveryPartner(userId.trim(), vehicleType.trim() || undefined),
        onSuccess: () => {
            setUserId('');
            setVehicleType('');
            setCreateError(null);
            invalidate();
        },
        onError: (err) =>
            setCreateError(err instanceof ApiError ? err.message : 'Could not create.'),
    });
    const activate = useMutation({
        mutationFn: (id: string) => apiClient.activateDeliveryPartner(id),
        onSuccess: invalidate,
    });
    const deactivate = useMutation({
        mutationFn: (id: string) => apiClient.deactivateDeliveryPartner(id),
        onSuccess: invalidate,
    });

    return (
        <AppShell title="Delivery partners">
            <Section>
                <h3>Onboard a delivery partner</h3>
                <ActionRow>
                    <Field
                        placeholder="Existing user id"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                    />
                    <Field
                        placeholder="Vehicle type (optional)"
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                    />
                    <Button
                        disabled={!userId.trim() || create.isPending}
                        onClick={() => create.mutate()}
                    >
                        Create
                    </Button>
                </ActionRow>
                {createError && <ErrorText>{createError}</ErrorText>}
            </Section>

            <Section>
                <h3>All partners</h3>
                {partners.isLoading && <p>Loading…</p>}
                {partners.isError && <p>Could not load delivery partners.</p>}
                {partners.data && partners.data.data.length === 0 && (
                    <p>No delivery partners yet.</p>
                )}
                <List>
                    {partners.data?.data.map((partner) => (
                        <Row key={partner.id}>
                            <span>
                                {partner.user.full_name ?? partner.user.phone} ({partner.user.phone}
                                )
                                <br />
                                <small>
                                    {partner.vehicle_type ?? 'No vehicle set'} —{' '}
                                    {partner.is_approved ? 'Active' : 'Inactive'}
                                </small>
                            </span>
                            <ActionRow>
                                <Link to={`/admin/delivery-partners/${partner.id}/cod`}>COD</Link>
                                {partner.is_approved ? (
                                    <DangerButton
                                        disabled={deactivate.isPending}
                                        onClick={() => deactivate.mutate(partner.id)}
                                    >
                                        Deactivate
                                    </DangerButton>
                                ) : (
                                    <Button
                                        disabled={activate.isPending}
                                        onClick={() => activate.mutate(partner.id)}
                                    >
                                        Activate
                                    </Button>
                                )}
                            </ActionRow>
                        </Row>
                    ))}
                </List>
            </Section>

            <p>
                <Link to="/admin/delivery-queue">View eligible delivery orders →</Link>
            </p>
        </AppShell>
    );
}
