import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { QuantityStepper } from './QuantityStepper';

describe('QuantityStepper', () => {
    it('shows an Add affordance at zero quantity', () => {
        const onIncrement = vi.fn();
        render(
            withTheme(
                <QuantityStepper quantity={0} onIncrement={onIncrement} onDecrement={vi.fn()} />,
            ),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
        expect(onIncrement).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('−')).not.toBeInTheDocument();
    });

    it('shows a −/count/+ stepper once quantity is above zero', () => {
        const onIncrement = vi.fn();
        const onDecrement = vi.fn();
        render(
            withTheme(
                <QuantityStepper
                    quantity={2}
                    onIncrement={onIncrement}
                    onDecrement={onDecrement}
                />,
            ),
        );

        expect(screen.getByText('2')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
        fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }));
        expect(onIncrement).toHaveBeenCalledTimes(1);
        expect(onDecrement).toHaveBeenCalledTimes(1);
    });

    it('disables the + button once max is reached', () => {
        render(
            withTheme(
                <QuantityStepper
                    quantity={3}
                    max={3}
                    onIncrement={vi.fn()}
                    onDecrement={vi.fn()}
                />,
            ),
        );

        expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
    });
});
