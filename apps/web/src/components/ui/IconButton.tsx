import styled from 'styled-components';

export interface IconButtonProps {
    $active?: boolean;
}

/** A square, pill-shaped tap target for a single icon — no label. */
export const IconButton = styled.button<IconButtonProps>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${({ theme }) => theme.radii.full};
    border: none;
    background: ${({ $active, theme }) => ($active ? theme.colors.primaryLight : 'transparent')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textPrimary)};
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }

    &:disabled {
        color: ${({ theme }) => theme.colors.textMuted};
        cursor: not-allowed;
    }
`;
