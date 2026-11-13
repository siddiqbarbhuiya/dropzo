import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MerchantOnboardingPage } from './MerchantOnboardingPage';
import { withTheme } from '../../test/renderWithProviders';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../lib/apiClient';
import type { MerchantApplication } from '@dropzo/api-client';

const mockExistingApplication: MerchantApplication = {
    id: 'app-bdp-089',
    owner_user_id: 'user-merchant-1',
    legal_name: 'Maa Tara Groceries Pvt Ltd',
    display_name: 'Maa Tara Groceries',
    business_type: 'Retail Grocery / Kirana',
    contact_person_name: 'Rahim Uddin Barbhuiya',
    contact_phone: '9435100000',
    business_email: 'contact@maataragroceries.com',
    business_address: 'Stall No. 4, Station Road Market, Ward #4, Station Road',
    city: 'Badarpur',
    district: 'Karimganj',
    state: 'Assam',
    postal_code: '788806',
    business_description: 'Daily kirana and fresh essentials',
    verification_status: 'PENDING',
    submitted_at: '2026-11-13T10:00:00.000Z',
    reviewed_at: null,
    reviewed_by_user_id: null,
    rejection_reason: null,
    created_at: '2026-11-13T09:30:00.000Z',
    updated_at: '2026-11-13T10:00:00.000Z',
};

vi.mock('../../lib/apiClient', () => ({
    apiClient: {
        getMyMerchantApplication: vi.fn(),
        submitMerchantApplication: vi.fn(),
        updateOwnMerchantApplication: vi.fn(),
    },
}));

function renderOnboardingPage() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/merchant/onboarding']}>
                    <Routes>
                        <Route path="/merchant/onboarding" element={<MerchantOnboardingPage />} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('MerchantOnboardingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        useAuthStore.setState({
            user: {
                id: 'user-merchant-1',
                phone: '+919435100000',
                fullName: 'Rahim Uddin Barbhuiya',
                isActive: true,
                roles: ['MERCHANT_OWNER'],
            },
            tokens: {
                accessToken: 'test-token',
                refreshToken: 'refresh-token',
            },
        });
        vi.mocked(apiClient.getMyMerchantApplication).mockResolvedValue(null);
        vi.mocked(apiClient.submitMerchantApplication).mockResolvedValue(mockExistingApplication);
    });

    it('renders onboarding header, stepper, application info, and Step 1 form fields', async () => {
        renderOnboardingPage();

        expect(screen.getAllByText('Store Onboarding').length).toBeGreaterThan(0);
        expect(screen.getByText('Store Details & Badarpur Geofence')).toBeInTheDocument();
        expect(screen.getByLabelText(/Legal Business Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Store Display Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Store Contact Phone/i)).toBeInTheDocument();
        expect(screen.getByText(/Badarpur Central Zone Hub BD-04 Active/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save & Continue/i })).toBeInTheDocument();
    });

    it('advances through steps (Step 1 -> Step 2 -> Step 3 -> Step 4)', async () => {
        renderOnboardingPage();

        // Step 1: Click Save & Continue
        const nextBtn = screen.getByRole('button', { name: /Save & Continue/i });
        fireEvent.click(nextBtn);

        // Step 2: Owner Identity & KYC
        await waitFor(() => {
            expect(screen.getByText('Owner Identity & Legal Verification')).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/Proprietor \/ Legal Owner Full Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/12-Digit Aadhaar/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/10-Character Permanent Account Number/i)).toBeInTheDocument();

        // Step 2 -> Step 3
        fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

        await waitFor(() => {
            expect(screen.getByText('FSSAI & Trade License Registrations')).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/14-Digit FSSAI Registration/i)).toBeInTheDocument();
        expect(
            screen.getByLabelText(/Badarpur Town Municipal Board Trade License Number/i),
        ).toBeInTheDocument();

        // Step 3 -> Step 4
        fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

        await waitFor(() => {
            expect(screen.getByText('Daily Payout Account & GSTIN')).toBeInTheDocument();
        });
        expect(screen.getByLabelText(/Bank Account Holder Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Bank IFSC Code/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Merchant Application/i })).toBeInTheDocument();
    });

    it('submits the application and triggers submitMerchantApplication API call', async () => {
        renderOnboardingPage();

        // Navigate to Step 4
        fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));
        await waitFor(() => screen.getByText('Owner Identity & Legal Verification'));
        fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));
        await waitFor(() => screen.getByText('FSSAI & Trade License Registrations'));
        fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));
        await waitFor(() => screen.getByText('Daily Payout Account & GSTIN'));

        // Click Submit
        const submitBtn = screen.getByRole('button', { name: /Submit Merchant Application/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(apiClient.submitMerchantApplication).toHaveBeenCalledTimes(1);
        });

        expect(
            screen.getByText(/Application Submitted for Badarpur Hub Verification!/i),
        ).toBeInTheDocument();
    });

    it('renders application status banner when an existing application is loaded', async () => {
        vi.mocked(apiClient.getMyMerchantApplication).mockResolvedValue(mockExistingApplication);

        renderOnboardingPage();

        await waitFor(() => {
            expect(
                screen.getByText(
                    /Application Under Review by Badarpur Hub Dispatch Desk \(SLA < 4 hrs\)\./i,
                ),
            ).toBeInTheDocument();
        });
        expect(screen.getByText(/Application ID: app-bdp-089/i)).toBeInTheDocument();
    });
});
