import type { ReactNode } from 'react';
import { StatusPanel } from './StatusPanel';
import { Button } from './Button';

export interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    icon?: ReactNode;
}

/** Shown when a request fails. Offers a retry when the caller passes one. */
export function ErrorState({
    title = 'Something went wrong',
    description,
    onRetry,
    icon = '⚠️',
}: ErrorStateProps) {
    return (
        <StatusPanel
            icon={icon}
            title={title}
            description={description}
            action={
                onRetry && (
                    <Button $variant="secondary" $size="sm" onClick={onRetry}>
                        Try again
                    </Button>
                )
            }
        />
    );
}
