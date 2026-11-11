import styled from 'styled-components';
import { typeScale } from '../../theme';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
    tone: ToastTone;
    children: React.ReactNode;
}

const toneStyles: Record<ToastTone, { bg: string; fg: string }> = {
    success: { bg: '#DCFCE7', fg: '#15803D' },
    error: { bg: '#FFDAD6', fg: '#93000A' },
    warning: { bg: '#FEF3C7', fg: '#854D0E' },
    info: { bg: '#E0F2FE', fg: '#0369A1' },
};

const Wrapper = styled.div<{ $tone: ToastTone }>`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ $tone }) => toneStyles[$tone].bg};
    color: ${({ $tone }) => toneStyles[$tone].fg};
`;

/** Inline alert banner. For a transient floating toast, mount this inside a fixed-position stack. */
export function Toast({ tone, children }: ToastProps) {
    return (
        <Wrapper $tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
            {children}
        </Wrapper>
    );
}
