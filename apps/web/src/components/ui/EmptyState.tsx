import type { ReactNode } from 'react';
import { StatusPanel } from './StatusPanel';

export interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
}

/** Shown when a list or page has nothing to display yet. */
export function EmptyState({ title, description, action, icon = '🗒️' }: EmptyStateProps) {
    return <StatusPanel icon={icon} title={title} description={description} action={action} />;
}
