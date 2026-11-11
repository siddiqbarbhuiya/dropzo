import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { withTheme } from '../../test/renderWithProviders';
import { OTPInput } from './OTPInput';

describe('OTPInput', () => {
    it('renders one labeled digit box per length', () => {
        render(withTheme(<OTPInput value="" onChange={vi.fn()} aria-label="OTP" />));
        expect(screen.getByLabelText('Digit 1 of 4')).toBeInTheDocument();
        expect(screen.getByLabelText('Digit 4 of 4')).toBeInTheDocument();
    });

    it('advances focus to the next digit after typing', () => {
        render(withTheme(<OTPInput value="" onChange={vi.fn()} aria-label="OTP" />));
        const first = screen.getByLabelText('Digit 1 of 4');
        fireEvent.change(first, { target: { value: '1' } });
        expect(screen.getByLabelText('Digit 2 of 4')).toHaveFocus();
    });

    it('rejects non-digit paste content beyond the configured length', () => {
        const onChange = vi.fn();
        render(withTheme(<OTPInput value="" onChange={onChange} aria-label="OTP" />));
        const first = screen.getByLabelText('Digit 1 of 4');
        fireEvent.paste(first, { clipboardData: { getData: () => '12ab3456' } });
        expect(onChange).toHaveBeenCalledWith('1234');
    });
});
