import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage';
import { withTheme } from '../test/renderWithProviders';

const sendOtp = vi.fn();
const verifyOtp = vi.fn();
const getMe = vi.fn();

vi.mock('../lib/apiClient', () => ({
    apiClient: {
        sendOtp: (...args: unknown[]) => sendOtp(...args),
        verifyOtp: (...args: unknown[]) => verifyOtp(...args),
        getMe: (...args: unknown[]) => getMe(...args),
    },
}));

function renderPage() {
    const queryClient = new QueryClient();
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/login']}>
                    <LoginPage />
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('LoginPage', () => {
    it('renders the split canvas branding, trust badges, and hero elements', () => {
        renderPage();

        expect(screen.getByText(/Fresh harvest to your kitchen in/)).toBeInTheDocument();
        expect(screen.getAllByText('Badarpur').length).toBeGreaterThan(0);
        expect(screen.getByText('15-Min Hyper-Local Delivery')).toBeInTheDocument();
        expect(screen.getByText('Welcome to Dropzo')).toBeInTheDocument();
        expect(screen.getByText('Mobile Number')).toBeInTheDocument();
        expect(screen.getByText('15 Mins')).toBeInTheDocument();
        expect(screen.getByText('Farm Fresh')).toBeInTheDocument();
        expect(screen.getByText('No Minimum')).toBeInTheDocument();
    });

    it('switches roles and updates title and button labels', () => {
        renderPage();

        const merchantTab = screen.getByRole('tab', { name: /Merchant POS/ });
        fireEvent.click(merchantTab);
        expect(screen.getByText('Merchant Partner POS')).toBeInTheDocument();

        const adminTab = screen.getByRole('tab', { name: /Platform Admin/ });
        fireEvent.click(adminTab);
        expect(screen.getByText('Platform Admin Portal')).toBeInTheDocument();
    });

    it('handles the full OTP flow from phone input to code submission', async () => {
        sendOtp.mockResolvedValue({ message: 'OTP sent' });
        verifyOtp.mockResolvedValue({ accessToken: 'token-123', refreshToken: 'refresh-123' });
        getMe.mockResolvedValue({ id: 'user-1', phone: '9435028410', role: 'CUSTOMER' });

        renderPage();

        const phoneInput = screen.getByPlaceholderText('94351 00000');
        fireEvent.change(phoneInput, { target: { value: '9435028410' } });

        const sendButton = screen.getByRole('button', { name: /Get OTP/ });
        fireEvent.click(sendButton);

        await waitFor(() => expect(sendOtp).toHaveBeenCalledWith('9435028410'));
        await waitFor(() =>
            expect(screen.getByText('Enter 6-Digit One-Time Password')).toBeInTheDocument(),
        );

        // Enter OTP digits into individual inputs
        const otpInputs = screen.getAllByRole('textbox', { name: /Digit/ });
        expect(otpInputs).toHaveLength(6);
        ['1', '2', '3', '4', '5', '6'].forEach((digit, i) => {
            fireEvent.change(otpInputs[i], { target: { value: digit } });
        });

        const verifyButton = screen.getByRole('button', { name: /Verify OTP/ });
        fireEvent.click(verifyButton);

        await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith('9435028410', '123456'));
    });

    it('clears phone input with the clear button', () => {
        renderPage();

        const phoneInput = screen.getByPlaceholderText('94351 00000') as HTMLInputElement;
        fireEvent.change(phoneInput, { target: { value: '9435012345' } });
        expect(phoneInput.value).toBe('9435012345');

        const clearBtn = screen.getByRole('button', { name: /Clear mobile number/ });
        fireEvent.click(clearBtn);
        expect(phoneInput.value).toBe('');
    });

    it('allows editing phone number from the OTP verification step', async () => {
        sendOtp.mockResolvedValue({ message: 'OTP sent' });
        renderPage();

        const phoneInput = screen.getByPlaceholderText('94351 00000');
        fireEvent.change(phoneInput, { target: { value: '9435028410' } });

        const sendButton = screen.getByRole('button', { name: /Get OTP/ });
        fireEvent.click(sendButton);

        await waitFor(() =>
            expect(screen.getByText('Enter 6-Digit One-Time Password')).toBeInTheDocument(),
        );

        const editBtn = screen.getByRole('button', { name: 'Edit' });
        fireEvent.click(editBtn);

        // Should be back to phone step with Get OTP button visible
        expect(screen.getByRole('button', { name: /Get OTP/ })).toBeInTheDocument();
    });
});
