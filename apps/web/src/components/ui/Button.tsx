import styled, { css } from 'styled-components';
import { typeScale } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps {
    $variant?: ButtonVariant;
    $size?: ButtonSize;
    $fullWidth?: boolean;
}

const variantStyles = {
    primary: css`
        background: ${({ theme }) => theme.colors.primary};
        color: ${({ theme }) => theme.colors.textOnPrimary};
        box-shadow: ${({ theme }) => theme.shadows.ctaGlow};

        &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.primaryDark};
        }
    `,
    secondary: css`
        background: ${({ theme }) => theme.colors.surfaceContainerLowest};
        color: ${({ theme }) => theme.colors.primary};
        border: 1.5px solid ${({ theme }) => theme.colors.primary};

        &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.primaryLight};
        }
    `,
    danger: css`
        background: ${({ theme }) => theme.colors.error};
        color: ${({ theme }) => theme.colors.textOnPrimary};

        &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.errorText};
        }
    `,
    ghost: css`
        background: transparent;
        color: ${({ theme }) => theme.colors.textPrimary};

        &:hover:not(:disabled) {
            background: ${({ theme }) => theme.colors.surfaceContainer};
        }
    `,
};

const sizeStyles = {
    sm: css`
        padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.md}`};
    `,
    md: css`
        padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.xl}`};
    `,
};

export const Button = styled.button<ButtonProps>`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    border: none;
    border-radius: ${({ theme }) => theme.radii.full};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: ${({ theme }) => theme.spacing.sm};
    width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
    transition:
        background 0.15s ease,
        box-shadow 0.15s ease;

    ${({ $variant = 'primary' }) => variantStyles[$variant]}
    ${({ $size = 'md' }) => sizeStyles[$size]}

    &:active:not(:disabled) {
        transform: translateY(1px);
    }

    &:disabled {
        background: ${({ theme }) => theme.colors.surfaceDim};
        color: ${({ theme }) => theme.colors.textMuted};
        border-color: transparent;
        box-shadow: none;
        cursor: not-allowed;
    }
`;
