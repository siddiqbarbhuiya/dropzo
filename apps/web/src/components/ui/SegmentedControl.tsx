import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface SegmentOption<T extends string> {
    value: T;
    label: string;
}

export interface SegmentedControlProps<T extends string> {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    'aria-label': string;
}

const Track = styled.div`
    display: inline-flex;
    padding: ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ theme }) => theme.colors.surfaceContainer};
`;

const Segment = styled.button<{ $active: boolean }>`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    border: none;
    border-radius: ${({ theme }) => theme.radii.full};
    padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceContainerLowest : 'transparent')};
    color: ${({ $active, theme }) => ($active ? theme.colors.textPrimary : theme.colors.textMuted)};
    box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.card : 'none')};
    cursor: pointer;
`;

/** E.g. the "Express Delivery" vs "Store Pickup" fulfillment switcher. */
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    ...aria
}: SegmentedControlProps<T>) {
    return (
        <Track role="tablist" {...aria}>
            {options.map((option) => (
                <Segment
                    key={option.value}
                    role="tab"
                    aria-selected={option.value === value}
                    $active={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </Segment>
            ))}
        </Track>
    );
}
