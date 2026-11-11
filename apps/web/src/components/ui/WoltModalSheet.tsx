import type { ReactNode } from 'react';
import { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

export interface WoltModalSheetProps {
    /** Whether the sheet is visible. */
    isOpen: boolean;
    /** Callback invoked to close the sheet (via backdrop click, escape, or close button). */
    onClose: () => void;
    /** Primary title of the sheet. */
    title: ReactNode;
    /** Optional secondary subtitle or description text. */
    subtitle?: ReactNode;
    /** Optional badge pill rendered alongside the title. */
    badge?: ReactNode;
    /** Main content body rendered inside the scrollable container. */
    children: ReactNode;
    /** Optional sticky action container pinned beneath the scrollable content. */
    stickyActionBar?: ReactNode;
    /** Maximum height constraint (e.g. 'calc(100vh - 48px)', '82vh', '500px'). Defaults to 'calc(100vh - 48px)'. */
    maxHeight?: string;
    /** Whether to show the top drag pill handle. Defaults to true. */
    enableDrag?: boolean;
    /** Whether to show the centrally split half-in/half-out circular close button. Defaults to true. */
    showCloseButton?: boolean;
    /** Accessible label for the modal dialog. */
    ariaLabel?: string;
}

// ==================== ANIMATIONS ====================

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const slideUp = keyframes`
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
`;

// ==================== STYLED COMPONENTS ====================

const SheetPortal = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1400;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
`;

const SheetBackdrop = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: ${fadeIn} 0.25s ease-out forwards;
    cursor: pointer;
    z-index: 10;
`;

const SheetContainer = styled.section<{ $maxHeight: string }>`
    position: relative;
    z-index: 20;
    width: 100%;
    max-width: 440px;
    max-height: ${({ $maxHeight }) => $maxHeight};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-top-left-radius: 32px;
    border-top-right-radius: 32px;
    box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.35);
    padding: 1.75rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 0.34s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    will-change: transform;
    border-top: 1px solid rgba(255, 255, 255, 0.6);
`;

const CloseButton = styled.button`
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 9999px;
    background: #ffffff;
    color: #374151;
    border: 1px solid #e5e7eb;
    box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.12),
        0 4px 6px -4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 30;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        color: #111827;
        transform: translate(-50%, -50%) scale(1.05);
        box-shadow: 0 14px 20px -3px rgba(0, 0, 0, 0.18);
    }

    &:active {
        transform: translate(-50%, -50%) scale(0.92);
    }

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 2px;
    }
`;

const DragPill = styled.div`
    width: 3rem;
    height: 0.3125rem;
    background: #d4d4d8;
    border-radius: 9999px;
    margin: 0 auto 0.75rem;
    flex-shrink: 0;
`;

const SheetHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.75rem;
    flex-shrink: 0;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
`;

const SheetTitle = styled.h2`
    font-size: 1.375rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin: 0;
`;

const SheetSubtitle = styled.div`
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.4;
`;

const SheetBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const StickyActionBarContainer = styled.footer`
    flex-shrink: 0;
    padding-top: 0.875rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    margin-top: 0.5rem;
`;

const HomeIndicator = styled.div`
    width: 7.5rem;
    height: 0.25rem;
    background: rgba(26, 27, 34, 0.85);
    border-radius: 9999px;
    margin: 0.75rem auto 0;
    flex-shrink: 0;
`;

// ==================== COMPONENT ====================

/**
 * WoltModalSheet — Multi-page, dynamic height bottom sheet component for Dropzo quick-commerce.
 * Replicates the 1:1 Stitch Wolt Modal Sheet pattern with:
 * - Top-centered half-in/half-out circular close button
 * - Optional draggable handle pill
 * - Smooth spring slide-up entrance & backdrop blur
 * - Dynamic height constraints with scrollable content body
 * - Pinned sticky action bar
 * - iOS home indicator bar
 */
export function WoltModalSheet({
    isOpen,
    onClose,
    title,
    subtitle,
    badge,
    children,
    stickyActionBar,
    maxHeight = 'calc(100vh - 48px)',
    enableDrag = true,
    showCloseButton = true,
    ariaLabel,
}: WoltModalSheetProps) {
    useEffect(() => {
        if (!isOpen) return;

        // Prevent body scrolling while modal is open
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <SheetPortal
            role="presentation"
            data-testid="wolt-modal-sheet-portal"
            aria-label={ariaLabel || (typeof title === 'string' ? title : 'Modal Sheet')}
        >
            <SheetBackdrop
                data-testid="wolt-modal-backdrop"
                aria-label="Dismiss modal sheet"
                onClick={onClose}
            />

            <SheetContainer
                role="dialog"
                aria-modal="true"
                data-testid="wolt-modal-sheet"
                $maxHeight={maxHeight}
                onClick={(e) => e.stopPropagation()}
            >
                {showCloseButton && (
                    <CloseButton
                        type="button"
                        aria-label="Close modal"
                        data-testid="wolt-modal-close-button"
                        onClick={onClose}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '20px', fontWeight: 600 }}
                        >
                            close
                        </span>
                    </CloseButton>
                )}

                {enableDrag && <DragPill data-testid="wolt-drag-pill" />}

                <SheetHeader>
                    <TitleRow>
                        <SheetTitle>{title}</SheetTitle>
                        {badge && <div>{badge}</div>}
                    </TitleRow>
                    {subtitle && <SheetSubtitle>{subtitle}</SheetSubtitle>}
                </SheetHeader>

                <SheetBody data-testid="wolt-modal-body">{children}</SheetBody>

                {stickyActionBar && (
                    <StickyActionBarContainer data-testid="wolt-modal-actions">
                        {stickyActionBar}
                    </StickyActionBarContainer>
                )}

                <HomeIndicator data-testid="wolt-home-indicator" />
            </SheetContainer>
        </SheetPortal>
    );
}
