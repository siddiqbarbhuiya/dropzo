import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { Button } from './Button';

describe('Button', () => {
    it('renders its label and responds to clicks', () => {
        const onClick = vi.fn();
        render(withTheme(<Button onClick={onClick}>Send OTP</Button>));

        fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', () => {
        const onClick = vi.fn();
        render(
            withTheme(
                <Button disabled onClick={onClick}>
                    Send OTP
                </Button>,
            ),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

        expect(onClick).not.toHaveBeenCalled();
    });

    it.each(['primary', 'secondary', 'danger', 'ghost'] as const)(
        'renders the %s variant without throwing',
        (variant) => {
            render(withTheme(<Button $variant={variant}>Action</Button>));
            expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
        },
    );
});
