import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import styled from 'styled-components';

export interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    'aria-label'?: string;
}

const Row = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const Digit = styled.input`
    width: 48px;
    height: 56px;
    text-align: center;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    color: ${({ theme }) => theme.colors.textPrimary};

    &:focus-visible {
        border-color: ${({ theme }) => theme.colors.tertiary};
    }
`;

/** A 4-digit pickup/OTP code entry — see DESIGN-SYSTEM-EXTRACTION.md "4-Digit Pickup PIN Card". */
export function OTPInput({ length = 4, value, onChange, disabled, ...aria }: OTPInputProps) {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    function setDigit(index: number, char: string) {
        const next = digits.slice();
        next[index] = char;
        onChange(next.join('').slice(0, length));
        if (char && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
        event.preventDefault();
        onChange(event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length));
    }

    return (
        <Row role="group" {...aria}>
            {digits.map((digit, index) => (
                <Digit
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => setDigit(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${index + 1} of ${length}`}
                />
            ))}
        </Row>
    );
}
