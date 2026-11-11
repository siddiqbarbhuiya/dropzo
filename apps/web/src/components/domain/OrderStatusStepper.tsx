import styled from 'styled-components';
import type { OrderStatus } from '@dropzo/api-client';
import { typeScale } from '../../theme';

export interface OrderStatusStepperProps {
    status: OrderStatus;
}

/** The main happy-path sequence. Terminal failure/cancellation states are shown separately. */
const HAPPY_PATH: OrderStatus[] = [
    'CREATED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
];

const TERMINAL_FAILURE: OrderStatus[] = ['REJECTED', 'CANCELLED', 'DELIVERY_FAILED'];

const STEP_LABELS: Record<string, string> = {
    CREATED: 'Placed',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    ASSIGNED: 'Assigned',
    PICKED_UP: 'Picked up',
    OUT_FOR_DELIVERY: 'On the way',
    DELIVERED: 'Delivered',
    COMPLETED: 'Delivered',
};

const Row = styled.ol`
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const Step = styled.li<{ $state: 'done' | 'current' | 'pending' }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.xs};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ $state, theme }) =>
        $state === 'pending' ? theme.colors.textMuted : theme.colors.textPrimary};
`;

const Dot = styled.span<{ $state: 'done' | 'current' | 'pending' }>`
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: ${({ $state, theme }) =>
        $state === 'pending' ? theme.colors.surfaceDim : theme.colors.success};
    box-shadow: ${({ $state, theme }) => ($state === 'current' ? `0 0 0 4px ${theme.colors.successContainer}` : 'none')};
`;

const FailureBanner = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.error};
`;

/** Horizontal progress stepper for an order's lifecycle. */
export function OrderStatusStepper({ status }: OrderStatusStepperProps) {
    if (TERMINAL_FAILURE.includes(status)) {
        return (
            <FailureBanner role="status">
                Order {STEP_LABELS[status] ?? status.toLowerCase()}
            </FailureBanner>
        );
    }

    const normalized = status === 'COMPLETED' ? 'DELIVERED' : status;
    const currentIndex = HAPPY_PATH.indexOf(normalized);

    return (
        <Row aria-label="Order progress">
            {HAPPY_PATH.map((step, index) => {
                const state =
                    index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending';
                return (
                    <Step
                        key={step}
                        $state={state}
                        aria-current={state === 'current' ? 'step' : undefined}
                    >
                        <Dot $state={state} />
                        {STEP_LABELS[step]}
                    </Step>
                );
            })}
        </Row>
    );
}
