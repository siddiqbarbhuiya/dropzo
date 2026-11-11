import { SegmentedControl } from '../ui/SegmentedControl';

export type FulfillmentMode = 'DELIVERY' | 'PICKUP';

export interface FulfillmentSelectorProps {
    mode: FulfillmentMode;
    onChange: (mode: FulfillmentMode) => void;
}

/** "Express Delivery" vs "Store Pickup" switcher shown on Home, Catalogue and Checkout. */
export function FulfillmentSelector({ mode, onChange }: FulfillmentSelectorProps) {
    return (
        <SegmentedControl
            aria-label="Fulfillment method"
            value={mode}
            onChange={onChange}
            options={[
                { value: 'DELIVERY', label: 'Express Delivery' },
                { value: 'PICKUP', label: 'Store Pickup' },
            ]}
        />
    );
}
