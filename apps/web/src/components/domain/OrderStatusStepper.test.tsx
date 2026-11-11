import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { OrderStatusStepper } from './OrderStatusStepper';

describe('OrderStatusStepper', () => {
    it('marks the matching step as current for an in-progress status', () => {
        render(withTheme(<OrderStatusStepper status="PREPARING" />));
        expect(screen.getByText('Preparing').closest('li')).toHaveAttribute('aria-current', 'step');
        expect(screen.getByText('Ready').closest('li')).not.toHaveAttribute('aria-current');
    });

    it('shows a failure banner instead of the stepper for a terminal failure', () => {
        render(withTheme(<OrderStatusStepper status="REJECTED" />));
        expect(screen.getByRole('status')).toHaveTextContent('Order rejected');
        expect(screen.queryByText('Preparing')).not.toBeInTheDocument();
    });

    it('treats COMPLETED as the final Delivered step', () => {
        render(withTheme(<OrderStatusStepper status="COMPLETED" />));
        expect(screen.getByText('Delivered').closest('li')).toHaveAttribute('aria-current', 'step');
    });
});
