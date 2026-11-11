import type { ReactNode } from 'react';
import { useEffect } from 'react';
import styled from 'styled-components';
import { typeScale } from '../../theme';
import { IconButton } from './IconButton';

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(26, 27, 34, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: ${({ theme }) => theme.zIndex.modal};
    padding: ${({ theme }) => theme.spacing.lg};
`;

const Panel = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: ${({ theme }) => theme.radii.xl};
    box-shadow: ${({ theme }) => theme.shadows.modal};
    width: 100%;
    max-width: 28rem;
    max-height: 90vh;
    overflow-y: auto;
    padding: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h2`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
`;

/** A centered dialog. Closes on Escape and on overlay click. */
export function Modal({ open, onClose, title, children }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <Overlay role="presentation" onClick={onClose}>
            <Panel
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <Header>
                    <Title id="modal-title">{title}</Title>
                    <IconButton aria-label="Close" onClick={onClose}>
                        ✕
                    </IconButton>
                </Header>
                {children}
            </Panel>
        </Overlay>
    );
}
