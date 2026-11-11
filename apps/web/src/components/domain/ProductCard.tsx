import styled from 'styled-components';
import { Card } from '../ui/Card';
import { typeScale } from '../../theme';
import { ProductQuantityControl } from './ProductQuantityControl';

export interface ProductCardProps {
    name: string;
    priceLabel: string;
    unitLabel: string;
    imageUrl?: string;
    stockAvailable: number;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
}

const Thumbnail = styled.div<{ $imageUrl?: string }>`
    width: 100%;
    aspect-ratio: 1;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ $imageUrl, theme }) =>
        $imageUrl ? `url(${$imageUrl}) center / cover` : theme.colors.surfaceContainer};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Name = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const Unit = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Price = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.textPrimary};
`;

/** A single catalogue product tile with its own add/stepper control. */
export function ProductCard({
    name,
    priceLabel,
    unitLabel,
    imageUrl,
    stockAvailable,
    quantity,
    onQuantityChange,
}: ProductCardProps) {
    return (
        <Card $padded>
            <Thumbnail $imageUrl={imageUrl} />
            <Name>{name}</Name>
            <Unit>{unitLabel}</Unit>
            <Footer>
                <Price>{priceLabel}</Price>
                <ProductQuantityControl
                    quantity={quantity}
                    stockAvailable={stockAvailable}
                    onChange={onQuantityChange}
                />
            </Footer>
        </Card>
    );
}
