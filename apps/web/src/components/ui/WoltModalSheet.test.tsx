import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { WoltModalSheet } from './WoltModalSheet';

describe('WoltModalSheet', () => {
    it('renders nothing when isOpen is false', () => {
        render(
            withTheme(
                <WoltModalSheet isOpen={false} onClose={vi.fn()} title="Test Sheet">
                    <div>Content inside</div>
                </WoltModalSheet>,
            ),
        );
        expect(screen.queryByTestId('wolt-modal-sheet')).not.toBeInTheDocument();
    });

    it('renders title, subtitle, badge, content, drag pill and home indicator when open', () => {
        render(
            withTheme(
                <WoltModalSheet
                    isOpen={true}
                    onClose={vi.fn()}
                    title="Cart Summary"
                    subtitle="2 items from Badarpur Store"
                    badge={<span data-testid="test-badge">FAST</span>}
                    stickyActionBar={<button type="button">Proceed to Checkout</button>}
                >
                    <div data-testid="test-content">Item rows here</div>
                </WoltModalSheet>,
            ),
        );

        expect(screen.getByTestId('wolt-modal-sheet')).toBeInTheDocument();
        expect(screen.getByText('Cart Summary')).toBeInTheDocument();
        expect(screen.getByText('2 items from Badarpur Store')).toBeInTheDocument();
        expect(screen.getByTestId('test-badge')).toBeInTheDocument();
        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.getByTestId('wolt-drag-pill')).toBeInTheDocument();
        expect(screen.getByTestId('wolt-home-indicator')).toBeInTheDocument();
        expect(screen.getByTestId('wolt-modal-actions')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Proceed to Checkout' })).toBeInTheDocument();
    });

    it('calls onClose when clicking the top circular close button', () => {
        const onClose = vi.fn();
        render(
            withTheme(
                <WoltModalSheet isOpen={true} onClose={onClose} title="Sheet Title">
                    <div>Content</div>
                </WoltModalSheet>,
            ),
        );

        const closeBtn = screen.getByTestId('wolt-modal-close-button');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the backdrop overlay', () => {
        const onClose = vi.fn();
        render(
            withTheme(
                <WoltModalSheet isOpen={true} onClose={onClose} title="Sheet Title">
                    <div>Content</div>
                </WoltModalSheet>,
            ),
        );

        const backdrop = screen.getByTestId('wolt-modal-backdrop');
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing the Escape key', () => {
        const onClose = vi.fn();
        render(
            withTheme(
                <WoltModalSheet isOpen={true} onClose={onClose} title="Sheet Title">
                    <div>Content</div>
                </WoltModalSheet>,
            ),
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('supports hiding the top close button and drag pill via props', () => {
        render(
            withTheme(
                <WoltModalSheet
                    isOpen={true}
                    onClose={vi.fn()}
                    title="No Controls"
                    showCloseButton={false}
                    enableDrag={false}
                >
                    <div>Clean Content</div>
                </WoltModalSheet>,
            ),
        );

        expect(screen.queryByTestId('wolt-modal-close-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('wolt-drag-pill')).not.toBeInTheDocument();
        expect(screen.getByText('Clean Content')).toBeInTheDocument();
    });
});
