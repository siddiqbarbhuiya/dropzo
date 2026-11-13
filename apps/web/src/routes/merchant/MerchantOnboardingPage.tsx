import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import type { SubmitMerchantApplicationDto, MerchantApplication } from '@dropzo/api-client';
import { media } from '../../theme/media';
import { useAuthStore } from '../../store/useAuthStore';

// ================= STYLED COMPONENTS =================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
`;

const Header = styled.header`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;

const HeaderInner = styled.div`
    max-width: 1440px;
    margin: 0 auto;
    padding: 0.875rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const BrandBlock = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const LogoText = styled.span`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.02em;
`;

const MerchantHubBadge = styled.span`
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
`;

const BreadcrumbNav = styled.nav`
    display: none;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    ${media.desktop} {
        display: flex;
    }
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const SupportPill = styled.div`
    display: none;
    align-items: center;
    gap: 0.5rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 9999px;
    padding: 0.375rem 0.875rem;
    font-size: 0.8125rem;

    ${media.desktop} {
        display: flex;
    }
`;

const SaveExitButton = styled.button`
    all: unset;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
        color: ${({ theme }) => theme.colors.primary};
    }
`;

// Main Canvas Layout
const MainContent = styled.main`
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem 1rem 7rem;
    box-sizing: border-box;
    flex: 1;

    ${media.desktop} {
        padding: 2rem 1.5rem 6.5rem;
    }
`;

const ColumnsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;

    ${media.desktop} {
        grid-template-columns: 360px 1fr;
        gap: 2rem;
    }
`;

// Left Sidebar
const LeftSidebar = styled.aside`
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
`;

const StepperCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1.25rem;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;

const StepperHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.875rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainer};
`;

const StepItem = styled.div<{ $status: 'completed' | 'active' | 'pending' }>`
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    position: relative;
    cursor: ${({ $status }) => ($status === 'completed' ? 'pointer' : 'default')};
    opacity: ${({ $status }) => ($status === 'pending' ? 0.6 : 1)};
    margin-bottom: 1rem;

    &:last-child {
        margin-bottom: 0;
    }
`;

const StepIndicatorColumn = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
`;

const StepCircle = styled.div<{ $status: 'completed' | 'active' | 'pending' }>`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8125rem;
    font-weight: 700;
    transition: all 0.2s ease;

    ${({ $status, theme }) => {
        if ($status === 'completed') {
            return `
                background: ${theme.colors.secondary};
                color: #ffffff;
            `;
        }
        if ($status === 'active') {
            return `
                background: ${theme.colors.primary};
                color: #ffffff;
                box-shadow: 0 0 0 4px rgba(255, 87, 51, 0.2);
            `;
        }
        return `
            background: ${theme.colors.surfaceContainer};
            color: ${theme.colors.textSecondary};
            border: 1px solid ${theme.colors.borderOutlineVariant};
        `;
    }}
`;

const StepConnectorLine = styled.div<{ $completed?: boolean }>`
    width: 2px;
    height: 2.25rem;
    background: ${({ $completed, theme }) =>
        $completed ? theme.colors.secondary : theme.colors.surfaceContainerHighest};
    margin: 0.25rem 0;
`;

const PerksCard = styled.div`
    background: linear-gradient(135deg, #f4f2fd 0%, #eeedf7 100%);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1.25rem;
    padding: 1.25rem;
`;

const PerkRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    margin-bottom: 0.75rem;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SpecialistCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1.25rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
`;

// Main Form Cards
const FormCanvas = styled.section`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1.25rem;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    ${media.desktop} {
        padding: 2rem;
    }
`;

const StepHeadingBlock = styled.div`
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainer};
`;

const StepTag = styled.span`
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.primary};
    background: #ffdad3;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
`;

const FieldGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;

    ${media.desktop} {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const FieldBlock = styled.div<{ $fullWidth?: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    ${({ $fullWidth }) => ($fullWidth ? 'grid-column: 1 / -1;' : '')}
`;

const FieldLabel = styled.label`
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 0.6875rem 0.875rem;
    border-radius: 0.625rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background: #ffffff;
    font-size: 0.875rem;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.textPrimary};
    outline: none;
    transition: border-color 0.15s ease;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.12);
    }
`;

const Select = styled.select`
    width: 100%;
    box-sizing: border-box;
    padding: 0.6875rem 0.875rem;
    border-radius: 0.625rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background: #ffffff;
    font-size: 0.875rem;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.textPrimary};
    outline: none;
    transition: border-color 0.15s ease;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.12);
    }
`;

const Textarea = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 0.6875rem 0.875rem;
    border-radius: 0.625rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background: #ffffff;
    font-size: 0.875rem;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.textPrimary};
    outline: none;
    resize: vertical;
    min-height: 80px;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.12);
    }
`;

const GeofenceBadge = styled.div`
    background: #f4f2fd;
    border: 1px solid #e4beb6;
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
`;

const StorefrontPhotoBox = styled.div`
    border: 2px dashed ${({ theme }) => theme.colors.borderOutlineVariant};
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
        background: #ffffff;
    }
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    cursor: pointer;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.4;
    user-select: none;

    input[type='checkbox'] {
        margin-top: 0.1875rem;
        accent-color: ${({ theme }) => theme.colors.primary};
        width: 1.125rem;
        height: 1.125rem;
    }
`;

const VerificationAlertBadge = styled.div<{ $status: 'PENDING' | 'APPROVED' | 'REJECTED' }>`
    border-radius: 0.875rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-bottom: 1.5rem;

    ${({ $status, theme }) => {
        if ($status === 'APPROVED') {
            return `
                background: #e6f6ec;
                border: 1px solid ${theme.colors.secondary};
                color: #005320;
            `;
        }
        if ($status === 'REJECTED') {
            return `
                background: #ffebee;
                border: 1px solid ${theme.colors.error};
                color: #93000a;
            `;
        }
        return `
            background: #fff8e1;
            border: 1px solid #ffb300;
            color: #7a5200;
        `;
    }}
`;

// Sticky Bottom Action Bar
const BottomActionBar = styled.footer`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #ffffff;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
    padding: 0.875rem 1.5rem;
    z-index: 40;
`;

const BottomActionInner = styled.div`
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const PrimaryCta = styled.button`
    all: unset;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 700;
    padding: 0.625rem 1.5rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 87, 51, 0.25);
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: #e04422;
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SecondaryCta = styled.button`
    all: unset;
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        border-color: ${({ theme }) => theme.colors.textPrimary};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

// ================= COMPONENT =================

const DRAFT_STORAGE_KEY = 'dropzo_merchant_onboarding_draft';

interface OnboardingFormState {
    // Step 1: Store Profile
    legalName: string;
    displayName: string;
    businessType: string;
    contactPersonName: string;
    contactPhone: string;
    businessEmail: string;
    businessAddress: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    postalCode: string;
    businessDescription: string;
    storefrontPhotoUrl: string;

    // Step 2: KYC & Identity
    ownerDob: string;
    aadhaarNumber: string;
    panNumber: string;
    ownerDeclaration: boolean;

    // Step 3: Regulatory Compliance
    fssaiNumber: string;
    tradeLicenseNumber: string;
    fssaiCategory: string;
    foodSafetyDeclaration: boolean;

    // Step 4: Bank Settlement & GSTIN
    bankHolderName: string;
    bankAccountNumber: string;
    confirmAccountNumber: string;
    ifscCode: string;
    bankName: string;
    gstin: string;
}

const DEFAULT_FORM_STATE: OnboardingFormState = {
    legalName: 'Maa Tara Groceries Pvt Ltd',
    displayName: 'Maa Tara Groceries',
    businessType: 'Retail Grocery / Kirana',
    contactPersonName: 'Rahim Uddin Barbhuiya',
    contactPhone: '9435100000',
    businessEmail: 'contact@maataragroceries.com',
    businessAddress: 'Stall No. 4, Station Road Market, Ward #4',
    locality: 'Station Road',
    city: 'Badarpur',
    district: 'Karimganj',
    state: 'Assam',
    postalCode: '788806',
    businessDescription:
        'Daily essentials, packaged staples, fresh dairy, and authentic Assam pantry goods in Badarpur Town.',
    storefrontPhotoUrl:
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500',

    ownerDob: '1984-08-15',
    aadhaarNumber: '7845-9921-3412',
    panNumber: 'ABCDE1234F',
    ownerDeclaration: true,

    fssaiNumber: '20324001004128',
    tradeLicenseNumber: 'BTMB-TR-2024-8841',
    fssaiCategory: 'Retail Grocery & Food Store',
    foodSafetyDeclaration: true,

    bankHolderName: 'Rahim Uddin Barbhuiya',
    bankAccountNumber: '0057000100234567',
    confirmAccountNumber: '0057000100234567',
    ifscCode: 'PUNB0005700',
    bankName: 'Punjab National Bank - Badarpur Branch',
    gstin: '18ABCDE1234F1Z5',
};

export function MerchantOnboardingPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [formData, setFormData] = useState<OnboardingFormState>(() => {
        try {
            const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
            return saved ? JSON.parse(saved) : DEFAULT_FORM_STATE;
        } catch {
            return DEFAULT_FORM_STATE;
        }
    });
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Auto-save draft changes to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        } catch {
            // storage full or disabled
        }
    }, [formData]);

    // Fetch existing merchant application if one exists
    const applicationQuery = useQuery<MerchantApplication | null>({
        queryKey: ['my-merchant-application'],
        queryFn: () => apiClient.getMyMerchantApplication(),
        retry: false,
    });

    const submitMutation = useMutation({
        mutationFn: (payload: SubmitMerchantApplicationDto) =>
            apiClient.submitMerchantApplication(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-merchant-application'] });
            setSubmitSuccess(true);
            setFormError(null);
        },
        onError: (err: Error) => {
            setFormError(err.message || 'Failed to submit merchant application. Please review fields.');
        },
    });

    const updateField = <K extends keyof OnboardingFormState>(
        field: K,
        value: OnboardingFormState[K],
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleNext = () => {
        setFormError(null);
        if (currentStep === 1) {
            if (!formData.legalName || !formData.displayName || !formData.contactPhone) {
                setFormError('Please enter Store Legal Name, Display Name, and Contact Phone.');
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!formData.aadhaarNumber || !formData.panNumber || !formData.ownerDeclaration) {
                setFormError('Please complete Aadhaar, PAN, and confirm the owner declaration.');
                return;
            }
            setCurrentStep(3);
        } else if (currentStep === 3) {
            if (!formData.fssaiNumber || !formData.foodSafetyDeclaration) {
                setFormError('Please enter the 14-digit FSSAI number and confirm food safety.');
                return;
            }
            setCurrentStep(4);
        } else if (currentStep === 4) {
            if (!formData.bankAccountNumber || !formData.ifscCode) {
                setFormError('Please enter Bank Account Number and IFSC Code.');
                return;
            }
            // Execute submission
            const payload: SubmitMerchantApplicationDto = {
                legalName: formData.legalName,
                displayName: formData.displayName,
                businessType: formData.businessType,
                contactPersonName: formData.contactPersonName,
                contactPhone: formData.contactPhone,
                businessEmail: formData.businessEmail || undefined,
                businessAddress: `${formData.businessAddress}, ${formData.locality}`,
                city: formData.city,
                district: formData.district,
                state: formData.state,
                postalCode: formData.postalCode,
                businessDescription: formData.businessDescription || undefined,
            };
            submitMutation.mutate(payload);
        }
    };

    const handleBack = () => {
        setFormError(null);
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const existingApp = applicationQuery.data;

    return (
        <PageContainer>
            {/* Top Navigation Header */}
            <Header>
                <HeaderInner>
                    <BrandBlock>
                        <LogoText>Dropzo</LogoText>
                        <MerchantHubBadge>Merchant Hub</MerchantHubBadge>
                        <div
                            style={{
                                height: '1.25rem',
                                width: '1px',
                                background: '#e3e1ec',
                                margin: '0 0.5rem',
                            }}
                        />
                        <BreadcrumbNav>
                            <span>Merchant Portal</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                chevron_right
                            </span>
                            <span>Store Onboarding</span>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                chevron_right
                            </span>
                            <span style={{ color: '#B72301', fontWeight: 700 }}>
                                {currentStep === 1 && 'Store Profile'}
                                {currentStep === 2 && 'Owner Identity & KYC'}
                                {currentStep === 3 && 'Regulatory Compliance'}
                                {currentStep === 4 && 'Bank Settlement'}
                            </span>
                        </BreadcrumbNav>
                    </BrandBlock>

                    <HeaderActions>
                        <SupportPill>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#006E2D' }}
                            >
                                support_agent
                            </span>
                            <span>+91 3845 268000</span>
                            <span style={{ color: '#8F7069', fontSize: '11px' }}>• Badarpur Hub</span>
                        </SupportPill>

                        <SaveExitButton type="button" onClick={() => navigate('/merchant/orders')}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                exit_to_app
                            </span>
                            <span>Save & Exit</span>
                        </SaveExitButton>
                    </HeaderActions>
                </HeaderInner>
            </Header>

            {/* Main Application Area */}
            <MainContent>
                {/* Existing Verification Status Notice Banner */}
                {existingApp && (
                    <VerificationAlertBadge $status={existingApp.verification_status as 'PENDING' | 'APPROVED' | 'REJECTED'}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                            {existingApp.verification_status === 'APPROVED'
                                ? 'check_circle'
                                : existingApp.verification_status === 'REJECTED'
                                  ? 'cancel'
                                  : 'pending'}
                        </span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                                {existingApp.verification_status === 'APPROVED' &&
                                    'Merchant Application Approved! Your store is ready to receive orders.'}
                                {existingApp.verification_status === 'PENDING' &&
                                    'Application Under Review by Badarpur Hub Dispatch Desk (SLA < 4 hrs).'}
                                {existingApp.verification_status === 'REJECTED' &&
                                    `Application Needs Revision: ${existingApp.rejection_reason ?? 'Please update documentation.'}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                Application ID: {existingApp.id} • Registered to {user?.phone}
                            </div>
                        </div>
                    </VerificationAlertBadge>
                )}

                {submitSuccess && (
                    <VerificationAlertBadge $status="PENDING">
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '24px', color: '#006E2D' }}
                        >
                            verified
                        </span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                                Application Submitted for Badarpur Hub Verification!
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                Your store profile, FSSAI declaration, and bank settlement details have
                                been queued for validation.
                            </div>
                        </div>
                    </VerificationAlertBadge>
                )}

                {formError && (
                    <div
                        role="alert"
                        style={{
                            background: '#ffebee',
                            color: '#ba1a1a',
                            border: '1px solid #ffdad6',
                            borderRadius: '0.75rem',
                            padding: '0.875rem 1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: '1.25rem',
                        }}
                    >
                        {formError}
                    </div>
                )}

                <ColumnsGrid>
                    {/* Left Sidebar: Progress Stepper & Hub Assistance */}
                    <LeftSidebar>
                        <StepperCard>
                            <StepperHeader>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#1A1B22',
                                        }}
                                    >
                                        Store Onboarding
                                    </h2>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            marginTop: '0.125rem',
                                        }}
                                    >
                                        Application #BDP-APP-2025-089
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 800,
                                        background: '#7CF994',
                                        color: '#005320',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '9999px',
                                    }}
                                >
                                    {currentStep === 1 && '25% Completed'}
                                    {currentStep === 2 && '50% Completed'}
                                    {currentStep === 3 && '75% Completed'}
                                    {currentStep === 4 && '100% Ready'}
                                </span>
                            </StepperHeader>

                            {/* Vertical 4-Step Stepper */}
                            <div>
                                <StepItem
                                    $status={currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'}
                                    onClick={() => currentStep > 1 && setCurrentStep(1)}
                                >
                                    <StepIndicatorColumn>
                                        <StepCircle
                                            $status={currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'}
                                        >
                                            {currentStep > 1 ? (
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px' }}
                                                >
                                                    check
                                                </span>
                                            ) : (
                                                '1'
                                            )}
                                        </StepCircle>
                                        <StepConnectorLine $completed={currentStep > 1} />
                                    </StepIndicatorColumn>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: currentStep === 1 ? '#B72301' : '#5B403A',
                                            }}
                                        >
                                            Step 1 • Profile
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                            Store Profile & Locality
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Station Road Market, Badarpur
                                        </div>
                                    </div>
                                </StepItem>

                                <StepItem
                                    $status={currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending'}
                                    onClick={() => currentStep > 2 && setCurrentStep(2)}
                                >
                                    <StepIndicatorColumn>
                                        <StepCircle
                                            $status={currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending'}
                                        >
                                            {currentStep > 2 ? (
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px' }}
                                                >
                                                    check
                                                </span>
                                            ) : (
                                                '2'
                                            )}
                                        </StepCircle>
                                        <StepConnectorLine $completed={currentStep > 2} />
                                    </StepIndicatorColumn>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: currentStep === 2 ? '#B72301' : '#5B403A',
                                            }}
                                        >
                                            Step 2 • Identity
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                            Owner Identity & KYC
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Aadhaar, PAN & Store Photo
                                        </div>
                                    </div>
                                </StepItem>

                                <StepItem
                                    $status={currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending'}
                                    onClick={() => currentStep > 3 && setCurrentStep(3)}
                                >
                                    <StepIndicatorColumn>
                                        <StepCircle
                                            $status={currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending'}
                                        >
                                            {currentStep > 3 ? (
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px' }}
                                                >
                                                    check
                                                </span>
                                            ) : (
                                                '3'
                                            )}
                                        </StepCircle>
                                        <StepConnectorLine $completed={currentStep > 3} />
                                    </StepIndicatorColumn>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: currentStep === 3 ? '#B72301' : '#5B403A',
                                            }}
                                        >
                                            Step 3 • Regulatory
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                            FSSAI & Trade License
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Mandatory Food Standards
                                        </div>
                                    </div>
                                </StepItem>

                                <StepItem
                                    $status={currentStep === 4 ? 'active' : 'pending'}
                                >
                                    <StepIndicatorColumn>
                                        <StepCircle
                                            $status={currentStep === 4 ? 'active' : 'pending'}
                                        >
                                            4
                                        </StepCircle>
                                    </StepIndicatorColumn>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: currentStep === 4 ? '#B72301' : '#5B403A',
                                            }}
                                        >
                                            Step 4 • Banking
                                        </div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                            Bank Settlement & GSTIN
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Daily 10 PM Bank Payouts
                                        </div>
                                    </div>
                                </StepItem>
                            </div>
                        </StepperCard>

                        {/* Badarpur Partner Perks */}
                        <PerksCard>
                            <h3
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 800,
                                    margin: '0 0 0.75rem',
                                    color: '#1A1B22',
                                }}
                            >
                                Badarpur Partner Perks
                            </h3>
                            <PerkRow>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px', color: '#006E2D' }}
                                >
                                    rocket_launch
                                </span>
                                <div style={{ fontSize: '0.8125rem' }}>
                                    <strong>15-Minute Delivery:</strong> Dedicated fleet stationed at
                                    Badarpur Railway Station hub.
                                </div>
                            </PerkRow>
                            <PerkRow>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px', color: '#006E2D' }}
                                >
                                    currency_rupee
                                </span>
                                <div style={{ fontSize: '0.8125rem' }}>
                                    <strong>Daily 10 PM Settlements:</strong> Earnings auto-deposited into
                                    your registered bank account.
                                </div>
                            </PerkRow>
                            <PerkRow>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px', color: '#006E2D' }}
                                >
                                    verified
                                </span>
                                <div style={{ fontSize: '0.8125rem' }}>
                                    <strong>Zero Setup Fee:</strong> Free onboarding support and barcode
                                    catalog assistance.
                                </div>
                            </PerkRow>
                        </PerksCard>

                        {/* Local Specialist Assistance */}
                        <SpecialistCard>
                            <div
                                style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '9999px',
                                    background: '#B72301',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    flexShrink: 0,
                                }}
                            >
                                RA
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>
                                    Rafiq Ali • Onboarding Specialist
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                    Badarpur Hub Field Agent
                                </div>
                                <a
                                    href="tel:+919854011223"
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#B72301',
                                        textDecoration: 'none',
                                        display: 'inline-block',
                                        marginTop: '0.25rem',
                                    }}
                                >
                                    +91 98540 11223 • Call Assistance
                                </a>
                            </div>
                        </SpecialistCard>
                    </LeftSidebar>

                    {/* Main Step Canvas */}
                    <FormCanvas>
                        {/* STEP 1: STORE PROFILE & LOCALITY */}
                        {currentStep === 1 && (
                            <div>
                                <StepHeadingBlock>
                                    <StepTag>Step 1 of 4 • Store Profile</StepTag>
                                    <h1
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            margin: '0 0 0.375rem',
                                            color: '#1A1B22',
                                        }}
                                    >
                                        Store Details & Badarpur Geofence
                                    </h1>
                                    <p style={{ fontSize: '0.875rem', color: '#5B403A', margin: 0 }}>
                                        Establish your grocery storefront identity and verify your local
                                        fulfillment boundary in Badarpur Town.
                                    </p>
                                </StepHeadingBlock>

                                <FieldGrid>
                                    <FieldBlock>
                                        <FieldLabel htmlFor="legalName">
                                            Legal Business Name *
                                        </FieldLabel>
                                        <Input
                                            id="legalName"
                                            value={formData.legalName}
                                            onChange={(e) => updateField('legalName', e.target.value)}
                                            placeholder="e.g. Maa Tara Groceries Pvt Ltd"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="displayName">
                                            Store Display Name (Customer Facing) *
                                        </FieldLabel>
                                        <Input
                                            id="displayName"
                                            value={formData.displayName}
                                            onChange={(e) => updateField('displayName', e.target.value)}
                                            placeholder="e.g. Maa Tara Groceries"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="businessType">
                                            Store Category / Business Type
                                        </FieldLabel>
                                        <Select
                                            id="businessType"
                                            value={formData.businessType}
                                            onChange={(e) => updateField('businessType', e.target.value)}
                                        >
                                            <option value="Retail Grocery / Kirana">
                                                Retail Grocery / Daily Kirana
                                            </option>
                                            <option value="Fresh Fruits & Vegetables">
                                                Fresh Fruits & Vegetables
                                            </option>
                                            <option value="Dairy, Bakery & Sweets">
                                                Dairy, Bakery & Sweets
                                            </option>
                                            <option value="General & Household Store">
                                                General & Household Store
                                            </option>
                                        </Select>
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="contactPhone">
                                            Store Contact Phone (WhatsApp Orders) *
                                        </FieldLabel>
                                        <Input
                                            id="contactPhone"
                                            value={formData.contactPhone}
                                            onChange={(e) => updateField('contactPhone', e.target.value)}
                                            placeholder="10-digit mobile number"
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel htmlFor="businessAddress">
                                            Physical Store Address (Street & Stall No.) *
                                        </FieldLabel>
                                        <Input
                                            id="businessAddress"
                                            value={formData.businessAddress}
                                            onChange={(e) =>
                                                updateField('businessAddress', e.target.value)
                                            }
                                            placeholder="Stall number, building, landmark"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="locality">Locality / Ward *</FieldLabel>
                                        <Input
                                            id="locality"
                                            value={formData.locality}
                                            onChange={(e) => updateField('locality', e.target.value)}
                                            placeholder="Station Road / Ward #4"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="postalCode">Pin Code *</FieldLabel>
                                        <Input
                                            id="postalCode"
                                            value={formData.postalCode}
                                            onChange={(e) => updateField('postalCode', e.target.value)}
                                            placeholder="788806"
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel htmlFor="businessDescription">
                                            Store Description & Specials
                                        </FieldLabel>
                                        <Textarea
                                            id="businessDescription"
                                            value={formData.businessDescription}
                                            onChange={(e) =>
                                                updateField('businessDescription', e.target.value)
                                            }
                                            placeholder="Highlight fresh produce, pantry brands, and daily essentials available..."
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel>Badarpur Hub Geofence Radar</FieldLabel>
                                        <GeofenceBadge>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '24px', color: '#006E2D' }}
                                            >
                                                pin_drop
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                                    Badarpur Central Zone Hub BD-04 Active
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                    GPS Coordinates: 24.9015° N, 92.5442° E • Verified within
                                                    2.5 km rapid courier dispatch perimeter.
                                                </div>
                                            </div>
                                        </GeofenceBadge>
                                    </FieldBlock>
                                </FieldGrid>
                            </div>
                        )}

                        {/* STEP 2: OWNER IDENTITY & KYC */}
                        {currentStep === 2 && (
                            <div>
                                <StepHeadingBlock>
                                    <StepTag>Step 2 of 4 • Owner KYC</StepTag>
                                    <h1
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            margin: '0 0 0.375rem',
                                            color: '#1A1B22',
                                        }}
                                    >
                                        Owner Identity & Legal Verification
                                    </h1>
                                    <p style={{ fontSize: '0.875rem', color: '#5B403A', margin: 0 }}>
                                        Confirm proprietor identification documents to secure merchant payouts
                                        and legal compliance.
                                    </p>
                                </StepHeadingBlock>

                                <FieldGrid>
                                    <FieldBlock>
                                        <FieldLabel htmlFor="contactPersonName">
                                            Proprietor / Legal Owner Full Name *
                                        </FieldLabel>
                                        <Input
                                            id="contactPersonName"
                                            value={formData.contactPersonName}
                                            onChange={(e) =>
                                                updateField('contactPersonName', e.target.value)
                                            }
                                            placeholder="As per Aadhaar / PAN card"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="ownerDob">Date of Birth *</FieldLabel>
                                        <Input
                                            id="ownerDob"
                                            type="date"
                                            value={formData.ownerDob}
                                            onChange={(e) => updateField('ownerDob', e.target.value)}
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="aadhaarNumber">
                                            12-Digit Aadhaar Card Number *
                                        </FieldLabel>
                                        <Input
                                            id="aadhaarNumber"
                                            value={formData.aadhaarNumber}
                                            onChange={(e) => updateField('aadhaarNumber', e.target.value)}
                                            placeholder="XXXX-XXXX-XXXX"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="panNumber">
                                            10-Character Permanent Account Number (PAN) *
                                        </FieldLabel>
                                        <Input
                                            id="panNumber"
                                            value={formData.panNumber}
                                            onChange={(e) =>
                                                updateField('panNumber', e.target.value.toUpperCase())
                                            }
                                            placeholder="ABCDE1234F"
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel>Storefront Physical Verification Photo</FieldLabel>
                                        <StorefrontPhotoBox>
                                            <img
                                                src={formData.storefrontPhotoUrl}
                                                alt="Storefront Preview"
                                                style={{
                                                    maxWidth: '240px',
                                                    height: '140px',
                                                    objectFit: 'cover',
                                                    borderRadius: '0.5rem',
                                                    marginBottom: '0.75rem',
                                                }}
                                            />
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                Storefront Signboard Photo Verified
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                Clear image showing Maa Tara Groceries sign on Station Road.
                                            </div>
                                        </StorefrontPhotoBox>
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <CheckboxLabel>
                                            <input
                                                type="checkbox"
                                                checked={formData.ownerDeclaration}
                                                onChange={(e) =>
                                                    updateField('ownerDeclaration', e.target.checked)
                                                }
                                            />
                                            <span>
                                                I confirm that I am the sole proprietor / authorized legal
                                                signatory of this physical store in Badarpur, and all identity
                                                details provided are truthful and authentic.
                                            </span>
                                        </CheckboxLabel>
                                    </FieldBlock>
                                </FieldGrid>
                            </div>
                        )}

                        {/* STEP 3: REGULATORY COMPLIANCE */}
                        {currentStep === 3 && (
                            <div>
                                <StepHeadingBlock>
                                    <StepTag>Step 3 of 4 • Regulatory</StepTag>
                                    <h1
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            margin: '0 0 0.375rem',
                                            color: '#1A1B22',
                                        }}
                                    >
                                        FSSAI & Trade License Registrations
                                    </h1>
                                    <p style={{ fontSize: '0.875rem', color: '#5B403A', margin: 0 }}>
                                        Required for local grocery sales per Assam food safety regulations.
                                    </p>
                                </StepHeadingBlock>

                                <FieldGrid>
                                    <FieldBlock>
                                        <FieldLabel htmlFor="fssaiNumber">
                                            14-Digit FSSAI Registration / License Number *
                                        </FieldLabel>
                                        <Input
                                            id="fssaiNumber"
                                            value={formData.fssaiNumber}
                                            onChange={(e) => updateField('fssaiNumber', e.target.value)}
                                            placeholder="20324001004128"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="fssaiCategory">
                                            FSSAI Food Business Category
                                        </FieldLabel>
                                        <Select
                                            id="fssaiCategory"
                                            value={formData.fssaiCategory}
                                            onChange={(e) => updateField('fssaiCategory', e.target.value)}
                                        >
                                            <option value="Retail Grocery & Food Store">
                                                Retail Grocery & Food Store
                                            </option>
                                            <option value="Wholesaler & Packaged Staples">
                                                Wholesaler & Packaged Staples
                                            </option>
                                            <option value="Dairy & Perishable Products">
                                                Dairy & Perishable Products
                                            </option>
                                        </Select>
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel htmlFor="tradeLicenseNumber">
                                            Badarpur Town Municipal Board Trade License Number
                                        </FieldLabel>
                                        <Input
                                            id="tradeLicenseNumber"
                                            value={formData.tradeLicenseNumber}
                                            onChange={(e) =>
                                                updateField('tradeLicenseNumber', e.target.value)
                                            }
                                            placeholder="BTMB-TR-2024-8841"
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <div
                                            style={{
                                                background: '#e6f6ec',
                                                border: '1px solid #7cf994',
                                                borderRadius: '0.75rem',
                                                padding: '1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '24px', color: '#006E2D' }}
                                            >
                                                verified_user
                                            </span>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                        color: '#005320',
                                                    }}
                                                >
                                                    FSSAI Quality & Freshness Guarantee
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#005320' }}>
                                                    Dropzo displays official FSSAI badges on your store profile
                                                    to instill customer trust in Badarpur.
                                                </div>
                                            </div>
                                        </div>
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <CheckboxLabel>
                                            <input
                                                type="checkbox"
                                                checked={formData.foodSafetyDeclaration}
                                                onChange={(e) =>
                                                    updateField('foodSafetyDeclaration', e.target.checked)
                                                }
                                            />
                                            <span>
                                                I certify that all food products, packaged grains, and dairy items
                                                fulfill strict hygienic standards, valid expiration dates, and
                                                FSSAI storage protocols.
                                            </span>
                                        </CheckboxLabel>
                                    </FieldBlock>
                                </FieldGrid>
                            </div>
                        )}

                        {/* STEP 4: BANK SETTLEMENT & GSTIN */}
                        {currentStep === 4 && (
                            <div>
                                <StepHeadingBlock>
                                    <StepTag>Step 4 of 4 • Bank Settlement</StepTag>
                                    <h1
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            margin: '0 0 0.375rem',
                                            color: '#1A1B22',
                                        }}
                                    >
                                        Daily Payout Account & GSTIN
                                    </h1>
                                    <p style={{ fontSize: '0.875rem', color: '#5B403A', margin: 0 }}>
                                        Configure automated daily 10:00 PM bank settlements for orders fulfilled
                                        through Dropzo.
                                    </p>
                                </StepHeadingBlock>

                                <FieldGrid>
                                    <FieldBlock>
                                        <FieldLabel htmlFor="bankHolderName">
                                            Bank Account Holder Name *
                                        </FieldLabel>
                                        <Input
                                            id="bankHolderName"
                                            value={formData.bankHolderName}
                                            onChange={(e) => updateField('bankHolderName', e.target.value)}
                                            placeholder="Rahim Uddin Barbhuiya"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="ifscCode">
                                            Bank IFSC Code *
                                        </FieldLabel>
                                        <Input
                                            id="ifscCode"
                                            value={formData.ifscCode}
                                            onChange={(e) =>
                                                updateField('ifscCode', e.target.value.toUpperCase())
                                            }
                                            placeholder="PUNB0005700"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="bankAccountNumber">
                                            Bank Account Number *
                                        </FieldLabel>
                                        <Input
                                            id="bankAccountNumber"
                                            type="password"
                                            value={formData.bankAccountNumber}
                                            onChange={(e) =>
                                                updateField('bankAccountNumber', e.target.value)
                                            }
                                            placeholder="0057000100234567"
                                        />
                                    </FieldBlock>

                                    <FieldBlock>
                                        <FieldLabel htmlFor="confirmAccountNumber">
                                            Confirm Account Number *
                                        </FieldLabel>
                                        <Input
                                            id="confirmAccountNumber"
                                            value={formData.confirmAccountNumber}
                                            onChange={(e) =>
                                                updateField('confirmAccountNumber', e.target.value)
                                            }
                                            placeholder="0057000100234567"
                                        />
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <div
                                            style={{
                                                background: '#f4f2fd',
                                                border: '1px solid #dad9e3',
                                                borderRadius: '0.75rem',
                                                padding: '0.875rem 1rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                                    {formData.bankName}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                    IFSC Verified • Badarpur Town Branch, Karimganj District
                                                </div>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 800,
                                                    background: '#7cf994',
                                                    color: '#005320',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '9999px',
                                                }}
                                            >
                                                ✓ Instant Penny Match
                                            </span>
                                        </div>
                                    </FieldBlock>

                                    <FieldBlock $fullWidth>
                                        <FieldLabel htmlFor="gstin">
                                            Goods and Services Tax Identification Number (GSTIN)
                                            <span style={{ fontWeight: 400, color: '#5B403A' }}>
                                                (Optional for composition kiranas)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            id="gstin"
                                            value={formData.gstin}
                                            onChange={(e) =>
                                                updateField('gstin', e.target.value.toUpperCase())
                                            }
                                            placeholder="18ABCDE1234F1Z5"
                                        />
                                    </FieldBlock>
                                </FieldGrid>
                            </div>
                        )}
                    </FormCanvas>
                </ColumnsGrid>
            </MainContent>

            {/* Sticky Bottom Action Bar */}
            <BottomActionBar>
                <BottomActionInner>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px', color: '#006E2D' }}
                        >
                            cloud_done
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                            Draft saved to Badarpur session
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {currentStep > 1 && (
                            <SecondaryCta type="button" onClick={handleBack}>
                                Back
                            </SecondaryCta>
                        )}

                        <PrimaryCta
                            type="button"
                            onClick={handleNext}
                            disabled={submitMutation.isPending}
                        >
                            <span>
                                {currentStep < 4
                                    ? 'Save & Continue →'
                                    : submitMutation.isPending
                                      ? 'Submitting...'
                                      : 'Submit Merchant Application'}
                            </span>
                        </PrimaryCta>
                    </div>
                </BottomActionInner>
            </BottomActionBar>
        </PageContainer>
    );
}
