import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
`;

export interface SkeletonProps {
    $width?: string;
    $height?: string;
    $radius?: string;
}

/** A placeholder block shown while content loads. */
export const Skeleton = styled.div<SkeletonProps>`
    width: ${({ $width = '100%' }) => $width};
    height: ${({ $height = '1rem' }) => $height};
    border-radius: ${({ $radius, theme }) => $radius ?? theme.radii.sm};
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    animation: ${pulse} 1.5s ease-in-out infinite;
`;
