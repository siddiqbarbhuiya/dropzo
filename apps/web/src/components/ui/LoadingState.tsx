import styled, { keyframes } from 'styled-components';

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${({ theme }) => theme.spacing.xxl};
`;

const Spinner = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 3px solid ${({ theme }) => theme.colors.surfaceContainerHigh};
    border-top-color: ${({ theme }) => theme.colors.primary};
    animation: ${spin} 0.7s linear infinite;
`;

export interface LoadingStateProps {
    label?: string;
}

/** A centered spinner for a page or section still loading. */
export function LoadingState({ label = 'Loading' }: LoadingStateProps) {
    return (
        <Wrapper role="status" aria-label={label}>
            <Spinner />
        </Wrapper>
    );
}
