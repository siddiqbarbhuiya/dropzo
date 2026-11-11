import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeScale } from '../../theme';

export interface StatusPanelProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: ${({ theme }) => theme.spacing.sm};
    padding: ${({ theme }) => theme.spacing.xxl};
`;

const Icon = styled.div`
    font-size: 2.5rem;
    line-height: 1;
`;

const Title = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const Description = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textMuted};
    max-width: 24rem;
`;

/** Shared layout for EmptyState, ErrorState and LoadingState — not used directly by screens. */
export function StatusPanel({ icon, title, description, action }: StatusPanelProps) {
    return (
        <Wrapper>
            {icon && <Icon aria-hidden="true">{icon}</Icon>}
            <Title>{title}</Title>
            {description && <Description>{description}</Description>}
            {action}
        </Wrapper>
    );
}
