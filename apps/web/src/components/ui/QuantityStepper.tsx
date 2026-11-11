import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface QuantityStepperProps {
    quantity: number;
    onIncrement: () => void;
    onDecrement: () => void;
    max?: number;
    disabled?: boolean;
    addLabel?: string;
}

const Pill = styled.div<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    border-radius: ${({ theme }) => theme.radii.full};
    border: 1.5px solid ${({ theme }) => theme.colors.primary};
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surfaceContainerLowest)};
    color: ${({ $active, theme }) => ($active ? theme.colors.textOnPrimary : theme.colors.primary)};
    ${({ theme }) => typeScale(theme.typography.labelLg)}
`;

const StepButton = styled.button`
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const AddButton = styled.button`
    all: unset;
    padding: 0 ${({ theme }) => theme.spacing.lg};
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const Count = styled.span`
    min-width: 1.5rem;
    text-align: center;
`;

/** Toggles between an "ADD +" affordance and a −/count/+ stepper once quantity > 0. */
export function QuantityStepper({
    quantity,
    onIncrement,
    onDecrement,
    max,
    disabled,
    addLabel = 'ADD',
}: QuantityStepperProps) {
    if (quantity <= 0) {
        return (
            <Pill $active={false}>
                <AddButton onClick={onIncrement} disabled={disabled} aria-label="Add to cart">
                    {addLabel} +
                </AddButton>
            </Pill>
        );
    }

    return (
        <Pill $active>
            <StepButton onClick={onDecrement} disabled={disabled} aria-label="Decrease quantity">
                −
            </StepButton>
            <Count aria-live="polite">{quantity}</Count>
            <StepButton
                onClick={onIncrement}
                disabled={disabled || (max !== undefined && quantity >= max)}
                aria-label="Increase quantity"
            >
                +
            </StepButton>
        </Pill>
    );
}
