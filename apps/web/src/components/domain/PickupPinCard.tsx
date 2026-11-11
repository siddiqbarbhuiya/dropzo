import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface PickupPinCardProps {
    code: string;
    expiresAt: string;
    helperText?: string;
}

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.xl};
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: ${({ theme }) => theme.radii.xl};
`;

const DigitsRow = styled.div`
    display: flex;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const Digit = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 56px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    font-size: 2rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const Helper = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
    text-align: center;
`;

/** The 4-digit pickup/delivery handover code card (DESIGN-SYSTEM-EXTRACTION.md §3.4). */
export function PickupPinCard({ code, expiresAt, helperText }: PickupPinCardProps) {
    return (
        <Wrapper>
            <DigitsRow aria-label={`Code ${code.split('').join(' ')}`}>
                {code.split('').map((digit, index) => (
                    <Digit key={index} aria-hidden="true">
                        {digit}
                    </Digit>
                ))}
            </DigitsRow>
            <Helper>
                {helperText ?? 'Share this code only at the point of handover.'}
                <br />
                Expires {new Date(expiresAt).toLocaleString()}
            </Helper>
        </Wrapper>
    );
}
