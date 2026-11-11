import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
}

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const StyledSelect = styled.select`
    ${({ theme }) => typeScale(theme.typography.bodyLg)}
    width: 100%;
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};

    &:focus-visible {
        border-color: ${({ theme }) => theme.colors.tertiary};
    }

    &:disabled {
        background: ${({ theme }) => theme.colors.surfaceContainer};
        color: ${({ theme }) => theme.colors.textMuted};
    }
`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { label, id, children, ...rest },
    ref,
) {
    return (
        <Wrapper>
            {label && <Label htmlFor={id}>{label}</Label>}
            <StyledSelect ref={ref} id={id} {...rest}>
                {children}
            </StyledSelect>
        </Wrapper>
    );
});
