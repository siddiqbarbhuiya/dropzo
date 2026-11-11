import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { Modal } from './Modal';

describe('Modal', () => {
    it('renders nothing when closed', () => {
        render(
            withTheme(
                <Modal open={false} onClose={vi.fn()} title="Confirm">
                    Body
                </Modal>,
            ),
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders its content and title when open', () => {
        render(
            withTheme(
                <Modal open onClose={vi.fn()} title="Confirm">
                    Body text
                </Modal>,
            ),
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Body text')).toBeInTheDocument();
    });

    it('closes on Escape and on close-button click', () => {
        const onClose = vi.fn();
        render(
            withTheme(
                <Modal open onClose={onClose} title="Confirm">
                    Body
                </Modal>,
            ),
        );

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
