import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { media } from '../../theme';
import type { DeliveryAddress, FulfilmentType } from '@dropzo/api-client';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
`;

// --- Desktop Dedicated Checkout Header ---
const DesktopHeader = styled.header`
    display: none;

    ${media.desktop} {
        display: block;
        position: sticky;
        top: 0;
        z-index: 40;
        background: #ffffff;
        border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
`;

const DesktopHeaderInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 0.875rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
`;

const DesktopBrandRow = styled.div`
    display: flex;
    align-items: center;
    gap: 1.5rem;
`;

const BrandLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: inherit;
`;

const BrandIcon = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.3);
`;

const BrandHeading = styled.span`
    font-size: 1.375rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.02em;
`;

const HeaderDivider = styled.div`
    height: 1.5rem;
    width: 1px;
    background: ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const BackToStoreLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.8125rem;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const TrustAssuranceBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid rgba(0, 110, 45, 0.2);
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.secondary};
`;

const EncryptedBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    font-size: 0.6875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

// --- Mobile App Bar ---
const MobileHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(251, 248, 255, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;

    ${media.desktop} {
        display: none;
    }
`;

const MobileBackButton = styled.button`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: #ffffff;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const MobileHeaderCenter = styled.div`
    text-align: center;
`;

const MobileHeaderTitle = styled.h1`
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const MobileHeaderSubtitle = styled.div`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
`;

const MobileCartCountPill = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: #ffffff;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const MobileCartBadgeCount = styled.span`
    position: absolute;
    top: -0.25rem;
    right: -0.25rem;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.625rem;
    font-weight: 800;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

// --- Main Layout ---
const MainContent = styled.main`
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 1rem 1rem 7rem;
    flex: 1;

    ${media.desktop} {
        padding: 2rem 2rem 4rem;
    }
`;

const BreadcrumbRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const BreadcrumbTrail = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const OrderIdChip = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    background: #ffdad3;
    color: ${({ theme }) => theme.colors.rust};
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    text-transform: uppercase;
`;

const CheckoutGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    ${media.desktop} {
        grid-template-columns: 7fr 5fr;
        align-items: start;
        gap: 2rem;
    }
`;

const LeftColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
`;

const RightColumn = styled.div`
    ${media.desktop} {
        position: sticky;
        top: 5rem;
    }
`;

// Card Container
const Card = styled.section`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    border: 1px solid rgba(228, 190, 182, 0.4);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);

    ${media.desktop} {
        padding: 1.5rem;
    }
`;

// Single Store Banner
const SingleStoreBanner = styled.div`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid rgba(255, 87, 51, 0.3);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0.375rem;
        background: ${({ theme }) => theme.colors.primary};
    }
`;

const StoreBannerIcon = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: #ffdad3;
    color: ${({ theme }) => theme.colors.rust};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
`;

const SectionHeading = styled.h2`
    font-size: 1.125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
`;

// Fulfillment Selection
const FulfillmentPillsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;

    ${media.tablet} {
        grid-template-columns: 1fr 1fr;
    }
`;

const FulfillmentOptionCard = styled.label<{ $selected: boolean }>`
    display: flex;
    flex-direction: column;
    padding: 1rem;
    border-radius: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid
        ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.surfaceContainerHighest)};
    background: ${({ $selected }) => ($selected ? 'rgba(255, 218, 211, 0.25)' : '#ffffff')};

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const FulfillmentHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const FulfillmentInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
`;

const FulfillmentIconBox = styled.div<{ $selected: boolean }>`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.surfaceContainer)};
    color: ${({ $selected }) => ($selected ? '#ffffff' : 'inherit')};
    display: flex;
    align-items: center;
    justify-content: center;
`;

// Items List
const CartItemList = styled.div`
    display: flex;
    flex-direction: column;
    divide-y: 1px solid ${({ theme }) => theme.colors.surfaceContainer};
`;

const CartItemRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.875rem 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainer};

    &:last-child {
        border-bottom: none;
    }

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const CartItemProduct = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const CartItemThumb = styled.div`
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid rgba(228, 190, 182, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    flex-shrink: 0;

    img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
`;

const StepperBox = styled.div`
    display: inline-flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid rgba(228, 190, 182, 0.7);
    border-radius: 9999px;
    padding: 0.125rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`;

const StepperBtn = styled.button`
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.textPrimary};
    transition: background 0.15s;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

const StepperQty = styled.span`
    width: 1.75rem;
    text-align: center;
    font-size: 0.8125rem;
    font-weight: 700;
`;

// Offers & Coupons
const VoucherBox = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
`;

const VoucherInput = styled.input`
    flex: 1;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid rgba(228, 190, 182, 0.5);
    border-radius: 0.75rem;
    padding: 0.625rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const ApplyButton = styled.button`
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border: none;
    border-radius: 0.75rem;
    padding: 0 1rem;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textPrimary};

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
`;

const AppliedCouponChip = styled.div`
    margin-top: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    background: rgba(124, 249, 148, 0.25);
    border: 1px solid rgba(0, 110, 45, 0.25);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
`;

// Payment Method
const PaymentRadioCard = styled.label<{ $active: boolean }>`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1rem;
    border-radius: 0.875rem;
    border: 2px solid
        ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.surfaceContainerHighest)};
    background: ${({ $active }) => ($active ? 'rgba(255, 218, 211, 0.15)' : '#ffffff')};
    cursor: pointer;
    margin-bottom: 0.75rem;
`;

const DisabledPaymentCard = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1rem;
    border-radius: 0.875rem;
    border: 1px dashed ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    opacity: 0.7;
    cursor: not-allowed;
`;

// Order Summary Bill Breakdown
const BillSummaryCard = styled(Card)`
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
`;

const BillRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const SavingsAlert = styled.div`
    padding: 0.625rem;
    border-radius: 0.5rem;
    background: rgba(124, 249, 148, 0.3);
    border: 1px solid rgba(0, 110, 45, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #007230;
    margin: 0.75rem 0;
`;

const ConfirmOrderButton = styled.button`
    width: 100%;
    margin-top: 1rem;
    padding: 0.875rem 1.5rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    border: none;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(255, 87, 51, 0.35);
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.rust};
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

// Mobile Sticky Bottom Bar
const MobileStickyBar = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);

    ${media.desktop} {
        display: none;
    }
`;

// Empty Cart State
const EmptyCartView = styled.div`
    text-align: center;
    padding: 5rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
`;

const EmptyIconBox = styled.div`
    width: 5rem;
    height: 5rem;
    border-radius: 9999px;
    background: #ffdad3;
    color: ${({ theme }) => theme.colors.rust};
    display: flex;
    align-items: center;
    justify-content: center;
`;

// Address Modal
const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
`;

const ModalContent = styled.div`
    background: #ffffff;
    border-radius: 1.25rem;
    padding: 1.5rem;
    max-width: 28rem;
    width: 100%;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const FormGroup = styled.div`
    margin-bottom: 0.875rem;

    label {
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
        color: ${({ theme }) => theme.colors.textSecondary};
    }

    input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border-radius: 0.5rem;
        border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        font-size: 0.875rem;
        outline: none;

        &:focus {
            border-color: ${({ theme }) => theme.colors.primary};
        }
    }
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.25rem;
`;

// ==================== MAIN COMPONENT ====================

export function CheckoutPage() {
    const navigate = useNavigate();
    const cartItems = useCartStore((s) => s.items);
    const storeId = useCartStore((s) => s.storeId);
    const storeName = useCartStore((s) => s.storeName);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const clearCart = useCartStore((s) => s.clearCart);
    const isAuthenticated = useAuthStore((s) => Boolean(s.tokens));
    const user = useAuthStore((s) => s.user);

    const [fulfilmentType, setFulfilmentType] = useState<FulfilmentType>('PICKUP');
    const [couponCode, setCouponCode] = useState('DROPZO50');
    const [couponApplied, setCouponApplied] = useState(true);
    const [customerNotes, setCustomerNotes] = useState('');
    const [orderError, setOrderError] = useState<string | null>(null);

    // Default Badarpur delivery address
    const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
        recipientName: user?.fullName || 'Badarpur Resident',
        recipientPhone: user?.phone || '9435012345',
        addressLine1: 'Ward No. 3, Netaji Nagar',
        addressLine2: 'Near Station Road',
        landmark: 'Railway Colony Gate',
        locality: 'Badarpur Town',
        city: 'Badarpur',
        district: 'Karimganj',
        state: 'Assam',
        postalCode: '788806',
        latitude: 24.86,
        longitude: 92.51,
    });

    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [tempAddress, setTempAddress] = useState<DeliveryAddress>(deliveryAddress);

    // Fetch store meta if available
    const storeQuery = useQuery({
        queryKey: ['publicStore', storeId],
        queryFn: () => (storeId ? apiClient.getPublicStore(storeId) : null),
        enabled: Boolean(storeId),
    });

    const store = storeQuery.data;

    // Derived cart totals
    const itemsTotal = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [cartItems]);

    const totalCount = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.quantity, 0);
    }, [cartItems]);

    // Fees calculation
    const deliveryFee = fulfilmentType === 'DELIVERY' ? 20 : 0;
    const packagingFee = 15;
    const discountAmount = couponApplied ? 50 : 0;
    const totalPayable = Math.max(0, itemsTotal + deliveryFee + packagingFee - discountAmount);

    // Order Creation Mutation
    const createOrderMutation = useMutation({
        mutationFn: async () => {
            if (!isAuthenticated) {
                navigate(`/login?redirect=${encodeURIComponent('/checkout')}`);
                return null;
            }

            const idempotencyKey = crypto.randomUUID();
            return apiClient.createOrder(
                {
                    fulfilmentType,
                    deliveryAddress: fulfilmentType === 'DELIVERY' ? deliveryAddress : undefined,
                    expectedTotalAmount: totalPayable,
                    customerNotes: customerNotes.trim() ? customerNotes : undefined,
                },
                idempotencyKey,
            );
        },
        onSuccess: (order) => {
            if (!order) return;
            clearCart();
            navigate(`/orders/${order.id}`);
        },
        onError: (err: Error) => {
            setOrderError(err.message || 'Failed to place order. Please review your cart.');
        },
    });

    function handleApplyCoupon() {
        if (couponCode.trim().toUpperCase() === 'DROPZO50') {
            setCouponApplied(true);
        }
    }

    function handleSaveAddress() {
        setDeliveryAddress(tempAddress);
        setIsAddressModalOpen(false);
    }

    if (cartItems.length === 0) {
        return (
            <PageContainer>
                <DesktopHeader>
                    <DesktopHeaderInner>
                        <BrandLink to="/">
                            <BrandIcon>
                                <span className="material-symbols-outlined">shopping_bag</span>
                            </BrandIcon>
                            <BrandHeading>Dropzo</BrandHeading>
                        </BrandLink>
                    </DesktopHeaderInner>
                </DesktopHeader>
                <MainContent>
                    <EmptyCartView>
                        <EmptyIconBox>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '48px' }}
                            >
                                remove_shopping_cart
                            </span>
                        </EmptyIconBox>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                            Your Dropzo Cart is Empty
                        </h2>
                        <p style={{ color: '#5B403A', maxWidth: '400px', margin: 0 }}>
                            Explore fresh veggies, dairy, and local pantry essentials from Badarpur
                            neighborhood shops.
                        </p>
                        <Link
                            to="/"
                            style={{
                                display: 'inline-block',
                                marginTop: '1rem',
                                padding: '0.75rem 1.75rem',
                                background: '#FF5733',
                                color: '#ffffff',
                                borderRadius: '9999px',
                                textDecoration: 'none',
                                fontWeight: 700,
                            }}
                        >
                            Start Shopping
                        </Link>
                    </EmptyCartView>
                </MainContent>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Desktop Top Header */}
            <DesktopHeader>
                <DesktopHeaderInner>
                    <DesktopBrandRow>
                        <BrandLink to="/">
                            <BrandIcon>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    shopping_bag
                                </span>
                            </BrandIcon>
                            <BrandHeading>Dropzo</BrandHeading>
                        </BrandLink>
                        <HeaderDivider />
                        <BackToStoreLink to={storeId ? `/stores/${storeId}` : '/'}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                            >
                                arrow_back
                            </span>
                            <span>Back to {storeName || store?.name || 'Store'}</span>
                        </BackToStoreLink>
                    </DesktopBrandRow>

                    <TrustAssuranceBadge>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
                        >
                            verified_user
                        </span>
                        <span>100% Quality Assured from Trusted Neighborhood Store</span>
                    </TrustAssuranceBadge>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <EncryptedBadge>
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontVariationSettings: "'FILL' 1",
                                    fontSize: '16px',
                                    color: '#006E2D',
                                }}
                            >
                                lock
                            </span>
                            <span>End-to-End Encrypted</span>
                        </EncryptedBadge>
                        <div
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                borderRadius: '9999px',
                                background: '#EEEDF7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                            }}
                        >
                            DZ
                        </div>
                    </div>
                </DesktopHeaderInner>
            </DesktopHeader>

            {/* Mobile Header */}
            <MobileHeader>
                <MobileBackButton onClick={() => navigate(-1)} aria-label="Go back">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        arrow_back
                    </span>
                </MobileBackButton>
                <MobileHeaderCenter>
                    <MobileHeaderTitle>Checkout & Cart</MobileHeaderTitle>
                    <MobileHeaderSubtitle>
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontSize: '14px',
                                color: '#FF5733',
                                fontVariationSettings: "'FILL' 1",
                            }}
                        >
                            storefront
                        </span>
                        <span>{storeName || store?.name || 'Maa Tara Groceries'}</span>
                    </MobileHeaderSubtitle>
                </MobileHeaderCenter>
                <MobileCartCountPill>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        shopping_bag
                    </span>
                    <MobileCartBadgeCount>{totalCount}</MobileCartBadgeCount>
                </MobileCartCountPill>
            </MobileHeader>

            {/* Main Content */}
            <MainContent>
                <BreadcrumbRow>
                    <BreadcrumbTrail>
                        <span>Cart</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            chevron_right
                        </span>
                        <strong style={{ color: '#B72301' }}>Fulfillment & Review</strong>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                            chevron_right
                        </span>
                        <span style={{ opacity: 0.5 }}>Receipt & Tracking</span>
                    </BreadcrumbTrail>
                    <OrderIdChip>Order #DZ-CHECKOUT</OrderIdChip>
                </BreadcrumbRow>

                {orderError && (
                    <div
                        style={{
                            background: '#FFDAD6',
                            color: '#93000A',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '0.75rem',
                            marginBottom: '1.25rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}
                    >
                        {orderError}
                    </div>
                )}

                <CheckoutGrid>
                    {/* LEFT COLUMN */}
                    <LeftColumn>
                        {/* Single Store Fulfillment Banner */}
                        <SingleStoreBanner>
                            <StoreBannerIcon>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                                >
                                    storefront
                                </span>
                            </StoreBannerIcon>
                            <div>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                                        Single Merchant Fulfillment
                                    </h3>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            background: '#7CF994',
                                            color: '#005320',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '0.25rem',
                                        }}
                                    >
                                        Verified Partner
                                    </span>
                                </div>
                                <p
                                    style={{
                                        fontSize: '0.8125rem',
                                        color: '#5B403A',
                                        margin: '0.25rem 0 0',
                                    }}
                                >
                                    All {totalCount} items are from{' '}
                                    <strong>
                                        {storeName || store?.name || 'Maa Tara Groceries'} (Badarpur
                                        Town)
                                    </strong>
                                    . Delivery from multiple stores in a single order is not
                                    supported in MVP.
                                </p>
                            </div>
                        </SingleStoreBanner>

                        {/* Fulfillment Mode Selection */}
                        <Card>
                            <SectionTitleRow>
                                <SectionHeading>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: '#FF5733' }}
                                    >
                                        local_shipping
                                    </span>
                                    Select Fulfillment Mode
                                </SectionHeading>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        color: '#006E2D',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '9999px',
                                            background: '#006E2D',
                                        }}
                                    />
                                    Express Active
                                </span>
                            </SectionTitleRow>

                            <FulfillmentPillsGrid>
                                {/* Store Pickup Option */}
                                <FulfillmentOptionCard
                                    $selected={fulfilmentType === 'PICKUP'}
                                    onClick={() => setFulfilmentType('PICKUP')}
                                >
                                    <FulfillmentHeaderRow>
                                        <FulfillmentInfo>
                                            <FulfillmentIconBox
                                                $selected={fulfilmentType === 'PICKUP'}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '18px' }}
                                                >
                                                    shopping_bag
                                                </span>
                                            </FulfillmentIconBox>
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    Store Pickup
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        color: '#006E2D',
                                                    }}
                                                >
                                                    Ready in 20 min • FREE
                                                </div>
                                            </div>
                                        </FulfillmentInfo>
                                        <input
                                            type="radio"
                                            name="fulfilment"
                                            checked={fulfilmentType === 'PICKUP'}
                                            onChange={() => setFulfilmentType('PICKUP')}
                                        />
                                    </FulfillmentHeaderRow>
                                    <div
                                        style={{
                                            marginTop: '0.75rem',
                                            paddingTop: '0.75rem',
                                            borderTop: '1px solid rgba(228, 190, 182, 0.4)',
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.375rem',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{
                                                    fontSize: '15px',
                                                    color: '#FF5733',
                                                    marginTop: '1px',
                                                }}
                                            >
                                                location_on
                                            </span>
                                            <div>
                                                {store?.address ||
                                                    'Station Road, near Railway Colony, Badarpur'}
                                            </div>
                                        </div>
                                        <div
                                            style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}
                                        >
                                            850m away • Open till 10 PM
                                        </div>
                                    </div>
                                </FulfillmentOptionCard>

                                {/* Home Delivery Option */}
                                <FulfillmentOptionCard
                                    $selected={fulfilmentType === 'DELIVERY'}
                                    onClick={() => setFulfilmentType('DELIVERY')}
                                >
                                    <FulfillmentHeaderRow>
                                        <FulfillmentInfo>
                                            <FulfillmentIconBox
                                                $selected={fulfilmentType === 'DELIVERY'}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '18px' }}
                                                >
                                                    moped
                                                </span>
                                            </FulfillmentIconBox>
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    Home Delivery
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        color: '#5B403A',
                                                    }}
                                                >
                                                    30-45 min • ₹20 flat
                                                </div>
                                            </div>
                                        </FulfillmentInfo>
                                        <input
                                            type="radio"
                                            name="fulfilment"
                                            checked={fulfilmentType === 'DELIVERY'}
                                            onChange={() => setFulfilmentType('DELIVERY')}
                                        />
                                    </FulfillmentHeaderRow>
                                    <div
                                        style={{
                                            marginTop: '0.75rem',
                                            paddingTop: '0.75rem',
                                            borderTop: '1px solid rgba(228, 190, 182, 0.4)',
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <div>
                                            <strong>Deliver to: </strong>
                                            {deliveryAddress.addressLine1}, {deliveryAddress.city}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTempAddress(deliveryAddress);
                                                setIsAddressModalOpen(true);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#B72301',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            Change
                                        </button>
                                    </div>
                                </FulfillmentOptionCard>
                            </FulfillmentPillsGrid>
                        </Card>

                        {/* Cart Items List */}
                        <Card>
                            <SectionTitleRow>
                                <div>
                                    <SectionHeading>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ color: '#FF5733' }}
                                        >
                                            shopping_basket
                                        </span>
                                        Cart Items ({totalCount})
                                    </SectionHeading>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            marginTop: '0.125rem',
                                        }}
                                    >
                                        Fresh fulfillment guaranteed from {storeName || 'store'}
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        background: '#7CF994',
                                        color: '#005320',
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: '9999px',
                                    }}
                                >
                                    100% In-Stock
                                </span>
                            </SectionTitleRow>

                            <CartItemList>
                                {cartItems.map((item) => (
                                    <CartItemRow key={item.listingId}>
                                        <CartItemProduct>
                                            <CartItemThumb>
                                                {item.imageUrl ? (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.productName}
                                                    />
                                                ) : (
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ color: '#8F7069' }}
                                                    >
                                                        inventory_2
                                                    </span>
                                                )}
                                            </CartItemThumb>
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {item.productName}
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        color: '#5B403A',
                                                        marginTop: '0.125rem',
                                                    }}
                                                >
                                                    {item.variantName && (
                                                        <span
                                                            style={{
                                                                background: '#EEEDF7',
                                                                padding: '0.125rem 0.375rem',
                                                                borderRadius: '0.25rem',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {item.variantName}
                                                        </span>
                                                    )}
                                                    <span style={{ fontWeight: 700 }}>
                                                        ₹{item.price}
                                                    </span>
                                                    {item.mrp > item.price && (
                                                        <span
                                                            style={{
                                                                textDecoration: 'line-through',
                                                                color: '#8F7069',
                                                            }}
                                                        >
                                                            ₹{item.mrp}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </CartItemProduct>

                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                alignSelf: 'flex-end',
                                            }}
                                        >
                                            <StepperBox>
                                                <StepperBtn
                                                    aria-label={`Decrease quantity of ${item.productName}`}
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.listingId,
                                                            item.quantity - 1,
                                                        )
                                                    }
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        remove
                                                    </span>
                                                </StepperBtn>
                                                <StepperQty>{item.quantity}</StepperQty>
                                                <StepperBtn
                                                    aria-label={`Increase quantity of ${item.productName}`}
                                                    onClick={() =>
                                                        updateQuantity(
                                                            item.listingId,
                                                            item.quantity + 1,
                                                        )
                                                    }
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        add
                                                    </span>
                                                </StepperBtn>
                                            </StepperBox>
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    minWidth: '4rem',
                                                    textAlign: 'right',
                                                }}
                                            >
                                                ₹{item.price * item.quantity}
                                            </div>
                                        </div>
                                    </CartItemRow>
                                ))}
                            </CartItemList>

                            <div
                                style={{
                                    marginTop: '1rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #EEEDF7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.75rem',
                                    color: '#5B403A',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px', color: '#006E2D' }}
                                >
                                    inventory_2
                                </span>
                                <span>
                                    Items packed in hygienic, eco-friendly Dropzo paper bags.
                                </span>
                            </div>
                        </Card>

                        {/* Offers & Vouchers */}
                        <Card>
                            <label
                                style={{
                                    display: 'block',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Offers & Vouchers
                            </label>
                            <VoucherBox>
                                <VoucherInput
                                    type="text"
                                    placeholder="Enter promo code"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                />
                                <ApplyButton type="button" onClick={handleApplyCoupon}>
                                    Apply Code
                                </ApplyButton>
                            </VoucherBox>
                            {couponApplied && (
                                <AppliedCouponChip>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{
                                                color: '#006E2D',
                                                fontSize: '18px',
                                                fontVariationSettings: "'FILL' 1",
                                            }}
                                        >
                                            check_circle
                                        </span>
                                        <div>
                                            <strong style={{ color: '#006E2D' }}>
                                                DROPZO50 Applied
                                            </strong>
                                            <span
                                                style={{
                                                    display: 'block',
                                                    color: '#5B403A',
                                                    fontSize: '0.6875rem',
                                                }}
                                            >
                                                Special Welcome Discount: ₹50 Saved on order
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCouponApplied(false)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#BA1A1A',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            fontSize: '0.6875rem',
                                        }}
                                    >
                                        Remove
                                    </button>
                                </AppliedCouponChip>
                            )}
                        </Card>

                        {/* Payment Method Selector */}
                        <Card>
                            <SectionTitleRow>
                                <SectionHeading>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: '#FF5733' }}
                                    >
                                        payments
                                    </span>
                                    Payment Method
                                </SectionHeading>
                                <span style={{ fontSize: '0.6875rem', color: '#5B403A' }}>
                                    Zero prepay hassle
                                </span>
                            </SectionTitleRow>

                            {/* COD Active Radio */}
                            <PaymentRadioCard $active>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '2.5rem',
                                            height: '2.5rem',
                                            borderRadius: '9999px',
                                            background: '#FFDAD3',
                                            color: '#B72301',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px' }}
                                        >
                                            point_of_sale
                                        </span>
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.875rem' }}>
                                                Cash on{' '}
                                                {fulfilmentType === 'PICKUP'
                                                    ? 'Pickup'
                                                    : 'Delivery'}{' '}
                                                (COD)
                                            </strong>
                                            <span
                                                style={{
                                                    fontSize: '0.625rem',
                                                    fontWeight: 700,
                                                    background: '#7CF994',
                                                    color: '#005320',
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: '9999px',
                                                }}
                                            >
                                                Recommended
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                marginTop: '0.25rem',
                                            }}
                                        >
                                            Pay via cash or UPI directly{' '}
                                            {fulfilmentType === 'PICKUP'
                                                ? 'at store counter when collecting your groceries.'
                                                : 'to the delivery partner upon arrival.'}
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="radio"
                                    checked
                                    readOnly
                                    style={{ accentColor: '#FF5733' }}
                                />
                            </PaymentRadioCard>

                            {/* Online Payment Coming Soon */}
                            <DisabledPaymentCard>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '0.75rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '2.5rem',
                                            height: '2.5rem',
                                            borderRadius: '9999px',
                                            background: '#EEEDF7',
                                            color: '#5B403A',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px' }}
                                        >
                                            credit_card
                                        </span>
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                UPI, Cards & Netbanking
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.625rem',
                                                    fontWeight: 700,
                                                    background: '#E3E1EC',
                                                    color: '#5B403A',
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: '0.25rem',
                                                }}
                                            >
                                                Coming Soon
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#8F7069',
                                                marginTop: '0.25rem',
                                            }}
                                        >
                                            Online payment gateway rollout scheduled for next phase
                                            in Assam.
                                        </div>
                                    </div>
                                </div>
                                <input type="radio" disabled />
                            </DisabledPaymentCard>

                            {/* Customer Notes */}
                            <div style={{ marginTop: '1rem' }}>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        marginBottom: '0.25rem',
                                        color: '#5B403A',
                                    }}
                                >
                                    Special Instructions / Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Leave with security, call when outside..."
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                    style={{
                                        width: '100%',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #E3E1EC',
                                        padding: '0.5rem',
                                        fontSize: '0.8125rem',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                        </Card>
                    </LeftColumn>

                    {/* RIGHT COLUMN (Order Summary) */}
                    <RightColumn>
                        <BillSummaryCard>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '1rem',
                                }}
                            >
                                <div>
                                    <h3
                                        style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}
                                    >
                                        Bill Breakdown
                                    </h3>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            marginTop: '0.125rem',
                                        }}
                                    >
                                        Store: {storeName || store?.name || 'Maa Tara Groceries'}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderRadius: '9999px',
                                        background: '#EEEDF7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#FF5733',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        receipt_long
                                    </span>
                                </div>
                            </div>

                            <BillRow>
                                <span style={{ color: '#5B403A' }}>
                                    Items Total ({totalCount} items)
                                </span>
                                <strong>₹{itemsTotal}</strong>
                            </BillRow>

                            <BillRow>
                                <span style={{ color: '#5B403A' }}>
                                    {fulfilmentType === 'PICKUP'
                                        ? 'Store Pickup Fee'
                                        : 'Delivery Fee'}
                                </span>
                                {fulfilmentType === 'PICKUP' ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                textDecoration: 'line-through',
                                                color: '#8F7069',
                                            }}
                                        >
                                            ₹20
                                        </span>
                                        <strong style={{ color: '#006E2D' }}>FREE</strong>
                                    </div>
                                ) : (
                                    <strong>₹20</strong>
                                )}
                            </BillRow>

                            <BillRow>
                                <span style={{ color: '#5B403A' }}>Packaging & Handling</span>
                                <strong>₹{packagingFee}</strong>
                            </BillRow>

                            {couponApplied && (
                                <BillRow style={{ color: '#006E2D' }}>
                                    <span>Coupon Discount (DROPZO50)</span>
                                    <strong>-₹{discountAmount}</strong>
                                </BillRow>
                            )}

                            <div
                                style={{
                                    borderTop: '1px solid #E3E1EC',
                                    paddingTop: '0.75rem',
                                    marginTop: '0.5rem',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'baseline',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                                        Total Payable
                                    </span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 800,
                                                color: '#B72301',
                                            }}
                                        >
                                            ₹{totalPayable}
                                        </span>
                                        <span
                                            style={{
                                                display: 'block',
                                                fontSize: '0.6875rem',
                                                color: '#5B403A',
                                            }}
                                        >
                                            Inclusive of all local GST
                                        </span>
                                    </div>
                                </div>

                                <SavingsAlert>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        celebration
                                    </span>
                                    <span>
                                        You saved ₹
                                        {discountAmount + (fulfilmentType === 'PICKUP' ? 20 : 0)} on
                                        this order!
                                    </span>
                                </SavingsAlert>

                                <ConfirmOrderButton
                                    type="button"
                                    disabled={createOrderMutation.isPending}
                                    onClick={() => createOrderMutation.mutate()}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.6875rem',
                                                fontWeight: 500,
                                                opacity: 0.85,
                                            }}
                                        >
                                            {totalCount} Items
                                        </span>
                                        <span>₹{totalPayable}</span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span>
                                            {createOrderMutation.isPending
                                                ? 'Placing Order...'
                                                : 'Confirm Order'}
                                        </span>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '20px' }}
                                        >
                                            arrow_forward
                                        </span>
                                    </div>
                                </ConfirmOrderButton>

                                <div
                                    style={{
                                        marginTop: '1.25rem',
                                        paddingTop: '0.75rem',
                                        borderTop: '1px solid #EEEDF7',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: '#5B403A',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{
                                                color: '#006E2D',
                                                fontSize: '16px',
                                                fontVariationSettings: "'FILL' 1",
                                            }}
                                        >
                                            shield
                                        </span>
                                        <span>Safe checkout with Dropzo guarantee</span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ color: '#FF5733', fontSize: '16px' }}
                                        >
                                            phone_in_talk
                                        </span>
                                        <span>
                                            Store inquiry: <strong>+91 94350 XXXXX</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </BillSummaryCard>
                    </RightColumn>
                </CheckoutGrid>
            </MainContent>

            {/* Mobile Fixed Bottom Sticky Bar */}
            <MobileStickyBar>
                <div>
                    <span
                        style={{
                            fontSize: '0.625rem',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            color: '#5B403A',
                            display: 'block',
                        }}
                    >
                        Total Amount
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A1B22' }}>
                        ₹{totalPayable}
                    </span>
                </div>
                <button
                    type="button"
                    disabled={createOrderMutation.isPending}
                    onClick={() => createOrderMutation.mutate()}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1.25rem',
                        borderRadius: '9999px',
                        background: '#FF5733',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        boxShadow: '0 4px 12px rgba(255, 87, 51, 0.35)',
                    }}
                >
                    <span>
                        {createOrderMutation.isPending ? 'Placing Order...' : 'Confirm Order'}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        arrow_forward
                    </span>
                </button>
            </MobileStickyBar>

            {/* Address Edit Modal */}
            {isAddressModalOpen && (
                <ModalOverlay onClick={() => setIsAddressModalOpen(false)}>
                    <ModalContent onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem' }}>
                            Edit Delivery Address
                        </h3>
                        <FormGroup>
                            <label>Recipient Name</label>
                            <input
                                type="text"
                                value={tempAddress.recipientName}
                                onChange={(e) =>
                                    setTempAddress({
                                        ...tempAddress,
                                        recipientName: e.target.value,
                                    })
                                }
                            />
                        </FormGroup>
                        <FormGroup>
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                value={tempAddress.recipientPhone}
                                onChange={(e) =>
                                    setTempAddress({
                                        ...tempAddress,
                                        recipientPhone: e.target.value,
                                    })
                                }
                            />
                        </FormGroup>
                        <FormGroup>
                            <label>Address Line 1</label>
                            <input
                                type="text"
                                value={tempAddress.addressLine1}
                                onChange={(e) =>
                                    setTempAddress({ ...tempAddress, addressLine1: e.target.value })
                                }
                            />
                        </FormGroup>
                        <FormGroup>
                            <label>Landmark (Optional)</label>
                            <input
                                type="text"
                                value={tempAddress.landmark || ''}
                                onChange={(e) =>
                                    setTempAddress({ ...tempAddress, landmark: e.target.value })
                                }
                            />
                        </FormGroup>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                            }}
                        >
                            <FormGroup>
                                <label>City</label>
                                <input
                                    type="text"
                                    value={tempAddress.city}
                                    onChange={(e) =>
                                        setTempAddress({ ...tempAddress, city: e.target.value })
                                    }
                                />
                            </FormGroup>
                            <FormGroup>
                                <label>Postal Code</label>
                                <input
                                    type="text"
                                    value={tempAddress.postalCode || ''}
                                    onChange={(e) =>
                                        setTempAddress({
                                            ...tempAddress,
                                            postalCode: e.target.value,
                                        })
                                    }
                                />
                            </FormGroup>
                        </div>
                        <ModalActions>
                            <button
                                type="button"
                                onClick={() => setIsAddressModalOpen(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #E3E1EC',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAddress}
                                style={{
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    background: '#FF5733',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                }}
                            >
                                Save Address
                            </button>
                        </ModalActions>
                    </ModalContent>
                </ModalOverlay>
            )}
        </PageContainer>
    );
}
