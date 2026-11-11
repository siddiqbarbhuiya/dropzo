import styled from 'styled-components';
import type { OrderStatus } from '@dropzo/api-client';

const colors: Record<string, { bg: string; fg: string }> = {
    CREATED: { bg: '#e0f2fe', fg: '#0369a1' },
    ACCEPTED: { bg: '#fef9c3', fg: '#854d0e' },
    PREPARING: { bg: '#fef9c3', fg: '#854d0e' },
    READY: { bg: '#dcfce7', fg: '#15803d' },
    COMPLETED: { bg: '#dcfce7', fg: '#15803d' },
    REJECTED: { bg: '#fee2e2', fg: '#b91c1c' },
    CANCELLED: { bg: '#f1f5f9', fg: '#475569' },
};

const Badge = styled.span<{ $bg: string; $fg: string }>`
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${(props) => props.$bg};
    color: ${(props) => props.$fg};
`;

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
    const palette = colors[status] ?? { bg: '#f1f5f9', fg: '#334155' };
    return (
        <Badge $bg={palette.bg} $fg={palette.fg}>
            {status}
        </Badge>
    );
}
