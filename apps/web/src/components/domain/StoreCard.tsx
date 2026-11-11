import styled from 'styled-components';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { typeScale } from '../../theme';

export interface StoreCardProps {
    name: string;
    category: string;
    etaMinutes: number;
    imageUrl?: string;
    isOpen: boolean;
    onClick?: () => void;
}

const Thumbnail = styled.div<{ $imageUrl?: string }>`
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ $imageUrl, theme }) =>
        $imageUrl ? `url(${$imageUrl}) center / cover` : theme.colors.surfaceContainer};
    margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Name = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const Meta = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: ${({ theme }) => theme.spacing.sm};
`;

/** A store tile for the customer home/discovery grid. */
export function StoreCard({
    name,
    category,
    etaMinutes,
    imageUrl,
    isOpen,
    onClick,
}: StoreCardProps) {
    return (
        <Card $hoverable onClick={onClick}>
            <Thumbnail $imageUrl={imageUrl} />
            <Name>{name}</Name>
            <Meta>{category}</Meta>
            <Footer>
                <Meta>{etaMinutes} min</Meta>
                <Badge $tone={isOpen ? 'success' : 'neutral'}>{isOpen ? 'Open' : 'Closed'}</Badge>
            </Footer>
        </Card>
    );
}
