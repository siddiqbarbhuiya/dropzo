import styled from 'styled-components';
import { typeScale } from '../../theme';
import { Button as ThemedButton } from '../../components/ui';

/** Shared styled primitives for merchant/admin/delivery operational screens.
 * Button/SecondaryButton/DangerButton now delegate to the themed ui/Button so every
 * screen shares one button implementation; the rest are kept here until those screens migrate. */
export const Section = styled.section`
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: ${({ theme }) => theme.radii.xl};
    padding: ${({ theme }) => theme.spacing.lg};
    margin-bottom: ${({ theme }) => theme.spacing.lg};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
`;

export const ActionRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
    flex-wrap: wrap;
    align-items: center;
`;

export const Button = ThemedButton;

export const DangerButton = styled(ThemedButton).attrs({ $variant: 'danger' })``;

export const SecondaryButton = styled(ThemedButton).attrs({ $variant: 'secondary' })``;

export const Field = styled.input`
    ${({ theme }) => typeScale(theme.typography.bodyLg)}
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Select = styled.select`
    ${({ theme }) => typeScale(theme.typography.bodyLg)}
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
`;

export const ErrorText = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.error};
`;

export const SuccessText = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.success};
`;
