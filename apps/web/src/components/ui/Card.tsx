import styled from 'styled-components';

export interface CardProps {
    $padded?: boolean;
    $hoverable?: boolean;
}

export const Card = styled.div<CardProps>`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: ${({ theme }) => theme.radii.xl};
    box-shadow: ${({ theme }) => theme.shadows.card};
    padding: ${({ $padded = true, theme }) => ($padded ? theme.spacing.lg : '0')};
    transition: box-shadow 0.15s ease;

    ${({ $hoverable, theme }) =>
        $hoverable &&
        `
        cursor: pointer;
        &:hover { box-shadow: ${theme.shadows.cardHover}; }
    `}
`;
