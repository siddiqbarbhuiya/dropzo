import { QuantityStepper } from '../ui/QuantityStepper';

export interface ProductQuantityControlProps {
    quantity: number;
    stockAvailable: number;
    onChange: (quantity: number) => void;
}

/** Binds QuantityStepper to a product's stock ceiling and emits the resulting quantity. */
export function ProductQuantityControl({
    quantity,
    stockAvailable,
    onChange,
}: ProductQuantityControlProps) {
    return (
        <QuantityStepper
            quantity={quantity}
            max={stockAvailable}
            disabled={stockAvailable <= 0}
            onIncrement={() => onChange(Math.min(quantity + 1, stockAvailable))}
            onDecrement={() => onChange(Math.max(quantity - 1, 0))}
            addLabel={stockAvailable <= 0 ? 'OUT OF STOCK' : 'ADD'}
        />
    );
}
