import type { ReactNode } from 'react';
import styled from 'styled-components';
import { typeScale, media } from '../../theme';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    onBack?: () => void;
}

const Wrapper = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${({ theme }) => theme.spacing.lg};
    margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const TitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const BackButton = styled.button`
    all: unset;
    cursor: pointer;
    font-size: 1.25rem;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const Title = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineMd)}
    color: ${({ theme }) => theme.colors.textPrimary};

    ${media.desktop} {
        ${({ theme }) => typeScale(theme.typography.headlineLg)}
    }
`;

const Subtitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

/** Standard title row used at the top of every screen, with optional back arrow and action. */
export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
    return (
        <Wrapper>
            <TitleGroup>
                <TitleRow>
                    {onBack && (
                        <BackButton onClick={onBack} aria-label="Go back">
                            ←
                        </BackButton>
                    )}
                    <Title>{title}</Title>
                </TitleRow>
                {subtitle && <Subtitle>{subtitle}</Subtitle>}
            </TitleGroup>
            {action}
        </Wrapper>
    );
}
