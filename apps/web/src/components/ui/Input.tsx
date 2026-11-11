import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    $invalid?: boolean;
    label?: string;
    helperText?: string;
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

const StyledInput = styled.input<{ $invalid?: boolean }>`
    ${({ theme }) => typeScale(theme.typography.bodyLg)}
    width: 100%;
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid
        ${({ $invalid, theme }) => ($invalid ? theme.colors.error : theme.colors.borderSubtle)};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
    box-sizing: border-box;
    transition: border-color 0.15s ease;

    &::placeholder {
        color: ${({ theme }) => theme.colors.textMuted};
    }

    &:focus-visible {
        border-color: ${({ theme }) => theme.colors.tertiary};
    }

    &:disabled {
        background: ${({ theme }) => theme.colors.surfaceContainer};
        color: ${({ theme }) => theme.colors.textMuted};
    }
`;

const HelperText = styled.p<{ $invalid?: boolean }>`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ $invalid, theme }) => ($invalid ? theme.colors.error : theme.colors.textMuted)};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, helperText, $invalid, id, ...rest },
    ref,
) {
    return (
        <Wrapper>
            {label && <Label htmlFor={id}>{label}</Label>}
            <StyledInput ref={ref} id={id} $invalid={$invalid} aria-invalid={$invalid} {...rest} />
            {helperText && <HelperText $invalid={$invalid}>{helperText}</HelperText>}
        </Wrapper>
    );
});
