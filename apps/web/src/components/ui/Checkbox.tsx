import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    id?: string;
}

const Label = styled.label`
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;
`;

const Box = styled.input`
    width: 1.25rem;
    height: 1.25rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;

    &:disabled {
        cursor: not-allowed;
    }
`;

export function Checkbox({ checked, onChange, label, disabled, id }: CheckboxProps) {
    return (
        <Label htmlFor={id}>
            <Box
                type="checkbox"
                id={id}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
            {label}
        </Label>
    );
}
