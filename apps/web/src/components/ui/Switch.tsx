import styled from 'styled-components';

export interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    'aria-label': string;
}

const Track = styled.button<{ $checked: boolean }>`
    position: relative;
    width: 2.75rem;
    height: 1.5rem;
    border-radius: ${({ theme }) => theme.radii.full};
    border: none;
    background: ${({ $checked, theme }) => ($checked ? theme.colors.success : theme.colors.surfaceDim)};
    cursor: pointer;
    transition: background 0.15s ease;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Thumb = styled.span<{ $checked: boolean }>`
    position: absolute;
    top: 2px;
    left: ${({ $checked }) => ($checked ? 'calc(100% - 22px)' : '2px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: ${({ theme }) => theme.shadows.card};
    transition: left 0.15s ease;
`;

/** On/off toggle, e.g. the merchant terminal's "LOUD ALERT" switch. */
export function Switch({ checked, onChange, disabled, ...aria }: SwitchProps) {
    return (
        <Track
            type="button"
            role="switch"
            aria-checked={checked}
            $checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            {...aria}
        >
            <Thumb $checked={checked} />
        </Track>
    );
}
