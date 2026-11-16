import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withTheme } from '../../test/renderWithProviders';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { MerchantLoginPage } from './MerchantLoginPage';

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        sendOtp: vi.fn(),
        verifyOtp: vi.fn(),
        getMe: vi.fn(),
    },
}));

function renderPage(initialEntries = ['/merchant/login']) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={initialEntries}>
                    <Routes>
                        <Route path="/merchant/login" element={<MerchantLoginPage />} />
                        <Route
                            path="/merchant/orders"
                            element={<div>Merchant Orders Dashboard</div>}
                        />
                        <Route path="/login" element={<div>Generic Login Page</div>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantLoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.getState().clearSession();
        vi.mocked(apiClient.sendOtp).mockResolvedValue({
            status: 'sent',
            retryAfterSeconds: 45,
        });
        vi.mocked(apiClient.verifyOtp).mockResolvedValue({
            accessToken: 'test-jwt',
            refreshToken: 'test-refresh',
            isNewAccount: false,
        });
        vi.mocked(apiClient.getMe).mockResolvedValue({
            id: 'merchant-1',
            roles: ['MERCHANT_OWNER'],
            fullName: 'Bikram Das',
            phone: '+919435128419',
            isActive: true,
        });
    });

    it('renders top navigation bar, Badarpur Hub Live badge, feature showcase, and role tabs', () => {
        renderPage();

        // Top header & branding
        expect(screen.getByText('Dropzo Merchant')).toBeInTheDocument();
        expect(screen.getByText('Station Road Counter POS')).toBeInTheDocument();
        expect(screen.getAllByText(/Badarpur Hub Live/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Terminal Grid Active/i)).toBeInTheDocument();
        expect(screen.getByText('+91 3843 268 000')).toBeInTheDocument();

        // Showcase pane
        expect(
            screen.getByText(/Fast Counter Fulfillment & Daily Settlement Portal/i),
        ).toBeInTheDocument();
        expect(screen.getByText('Counter Order Chime')).toBeInTheDocument();
        expect(screen.getByText('FR-PICK-001 Verification')).toBeInTheDocument();
        expect(screen.getByText('Automated Reconciliation')).toBeInTheDocument();
        expect(screen.getByText('Maa Tara Groceries')).toBeInTheDocument();

        // Right card
        expect(screen.getByText('Customer')).toBeInTheDocument();
        expect(screen.getByText('Merchant POS')).toBeInTheDocument();
        expect(screen.getByText('Platform Admin')).toBeInTheDocument();
        expect(screen.getByText('Merchant POS Terminal Login')).toBeInTheDocument();
        expect(screen.getByText(/Terminal #BDP-089/i)).toBeInTheDocument();
    });

    it('allows typing mobile number, clears phone input on clear button, and requests OTP', async () => {
        renderPage();

        const phoneInput = screen.getByRole('textbox', { name: /registered mobile number/i });
        expect(phoneInput).toHaveValue('9435128419');

        // Clear input
        const clearBtn = screen.getByRole('button', { name: /clear mobile number/i });
        fireEvent.click(clearBtn);
        expect(phoneInput).toHaveValue('');

        // Type new phone number
        fireEvent.change(phoneInput, { target: { value: '9435199999' } });
        expect(phoneInput).toHaveValue('9435199999');

        // Click Continue
        const continueBtn = screen.getByRole('button', { name: /continue to store pos/i });
        fireEvent.click(continueBtn);

        await waitFor(() => {
            expect(apiClient.sendOtp).toHaveBeenCalledWith('+919435199999');
            expect(screen.getByText(/Enter 6-Digit Counter OTP/i)).toBeInTheDocument();
        });
    });

    it('enters 6-digit OTP code, calls verifyOtp, sets auth session, and navigates to orders dashboard', async () => {
        renderPage();

        // Step 1: submit phone
        const continueBtn = screen.getByRole('button', { name: /continue to store pos/i });
        fireEvent.click(continueBtn);

        await waitFor(() => {
            expect(screen.getByText(/Enter 6-Digit Counter OTP/i)).toBeInTheDocument();
        });

        // Step 2: Fill OTP boxes
        const otpInputs = screen.getAllByRole('textbox');
        expect(otpInputs.length).toBe(6);

        fireEvent.change(otpInputs[0], { target: { value: '1' } });
        fireEvent.change(otpInputs[1], { target: { value: '2' } });
        fireEvent.change(otpInputs[2], { target: { value: '3' } });
        fireEvent.change(otpInputs[3], { target: { value: '4' } });
        fireEvent.change(otpInputs[4], { target: { value: '5' } });
        fireEvent.change(otpInputs[5], { target: { value: '6' } });

        // Click Verify
        const verifyBtn = screen.getByRole('button', { name: /verify & open counter pos/i });
        fireEvent.click(verifyBtn);

        await waitFor(() => {
            expect(apiClient.verifyOtp).toHaveBeenCalledWith('+919435128419', '123456');
            expect(screen.getByText('Merchant Orders Dashboard')).toBeInTheDocument();
        });

        expect(useAuthStore.getState().tokens?.accessToken).toBe('test-jwt');
        expect(useAuthStore.getState().user?.fullName).toBe('Bikram Das');
    });

    it('navigates when clicking Customer role tab', () => {
        renderPage();

        const customerTab = screen.getByRole('button', { name: /^Customer$/i });
        fireEvent.click(customerTab);

        expect(screen.getByText('Generic Login Page')).toBeInTheDocument();
    });
});
