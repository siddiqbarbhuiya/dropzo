import type { OrderStatus } from '@dropzo/api-client';
import { Badge } from '../../components/ui';
import type { BadgeTone } from '../../components/ui';

const tones: Record<string, BadgeTone> = {
    CREATED: 'info',
    ACCEPTED: 'warning',
    PREPARING: 'warning',
    READY: 'success',
    ASSIGNED: 'brand',
    PICKED_UP: 'brand',
    OUT_FOR_DELIVERY: 'brand',
    DELIVERED: 'success',
    DELIVERY_FAILED: 'error',
    COMPLETED: 'success',
    REJECTED: 'error',
    FAILED: 'error',
    CANCELLED: 'neutral',
};

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
    return <Badge $tone={tones[status] ?? 'neutral'}>{status}</Badge>;
}
