import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface KeypadProps {
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    disabled?: boolean;
}

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: ${({ theme }) => theme.spacing.sm};
`;

const Key = styled.button`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    padding: ${({ theme }) => theme.spacing.lg} 0;
    border: none;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ClearKey = styled(Key)`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.error};
`;

/** A touch-friendly numeric keypad for entering a fixed-length code, e.g. at a store counter. */
export function Keypad({ value, onChange, maxLength, disabled }: KeypadProps) {
    function press(digit: string) {
        if (value.length < maxLength) onChange(value + digit);
    }

    function backspace() {
        onChange(value.slice(0, -1));
    }

    return (
        <Grid role="group" aria-label="Numeric keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <Key key={digit} type="button" disabled={disabled} onClick={() => press(digit)}>
                    {digit}
                </Key>
            ))}
            <ClearKey type="button" disabled={disabled} onClick={() => onChange('')}>
                CLR
            </ClearKey>
            <Key type="button" disabled={disabled} onClick={() => press('0')}>
                0
            </Key>
            <Key type="button" disabled={disabled} onClick={backspace} aria-label="Backspace">
                ⌫
            </Key>
        </Grid>
    );
}
