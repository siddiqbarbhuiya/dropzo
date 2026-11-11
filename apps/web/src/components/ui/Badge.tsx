import styled from 'styled-components';
import { typeScale } from '../../theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand';

export interface BadgeProps {
    $tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: '#F1F5F9', fg: '#475569' },
    success: { bg: '#DCFCE7', fg: '#15803D' },
    warning: { bg: '#FEF3C7', fg: '#854D0E' },
    error: { bg: '#FFDAD6', fg: '#93000A' },
    info: { bg: '#E0F2FE', fg: '#0369A1' },
    brand: { bg: '#FFECE8', fg: '#E04826' },
};

export const Badge = styled.span<BadgeProps>`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    display: inline-block;
    padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ $tone = 'neutral' }) => toneStyles[$tone].bg};
    color: ${({ $tone = 'neutral' }) => toneStyles[$tone].fg};
`;
