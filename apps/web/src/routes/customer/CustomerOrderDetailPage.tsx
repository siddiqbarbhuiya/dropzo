import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { media } from '../../theme';
import { LoadingState, ErrorState } from '../../components/ui';

// ==================== ANIMATIONS ====================

const pulseRing = keyframes`
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.15); opacity: 0.3; }
    100% { transform: scale(0.95); opacity: 0.8; }
`;

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

// ==================== LAYOUT COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
`;

// --- Desktop Global Header ---
const DesktopHeader = styled.header`
    display: none;

    ${media.desktop} {
        display: block;
        position: sticky;
        top: 0;
        z-index: 40;
        background: ${({ theme }) => theme.colors.surfaceContainerLowest};
        border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
`;

const DesktopHeaderInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 0.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
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
    color: ${({ theme }) => theme.colors.textOnPrimary};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const BrandHeading = styled.span`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.02em;
`;

const StorePinBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 1rem;
    border-left: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const DesktopNav = styled.nav`
    display: flex;
    align-items: center;
    gap: 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;

    a {
        text-decoration: none;
        color: ${({ theme }) => theme.colors.textSecondary};
        transition: color 0.15s;

        &:hover {
            color: ${({ theme }) => theme.colors.textPrimary};
        }
    }
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const ModeBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

// --- Mobile Top Bar ---
const MobileTopBar = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(251, 248, 255, 0.95);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 40;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHigh};

    ${media.desktop} {
        display: none;
    }
`;

const IconButton = styled.button`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    border: none;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.15s;

    &:active {
        transform: scale(0.95);
    }
`;

// --- Sub-Header Bar (Desktop) ---
const SubHeaderBar = styled.section`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    padding: 0.875rem 1rem;

    ${media.desktop} {
        padding: 0.875rem 2rem;
    }
`;

const SubHeaderInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
`;

const SubHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const OrderIdHeading = styled.span`
    font-size: 1.125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.01em;
`;

const StatusPill = styled.span<{ $variant?: 'secondary' | 'primary' | 'warning' }>`
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    background: ${({ $variant, theme }) =>
        $variant === 'secondary'
            ? theme.colors.successContainer
            : $variant === 'warning'
              ? theme.colors.warningContainer
              : theme.colors.primaryLight};
    color: ${({ $variant, theme }) =>
        $variant === 'secondary'
            ? theme.colors.secondary
            : $variant === 'warning'
              ? theme.colors.warning
              : theme.colors.rust};
`;

const SubHeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const PickupWindowPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const InvoiceButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: transparent;
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

// --- Main Canvas ---
const MainCanvas = styled.main`
    flex: 1;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem 1rem;

    ${media.desktop} {
        padding: 1.5rem 2rem;
    }
`;

// --- Confirmation Banner ---
const ConfirmationBanner = styled.div`
    width: 100%;
    background: ${({ theme }) => theme.colors.successContainer};
    color: ${({ theme }) => theme.colors.secondary};
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

    ${media.desktop} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const BannerContent = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
`;

const CheckCircleIcon = styled.div`
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.textOnSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const BannerTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.4;
    color: ${({ theme }) => theme.colors.secondary};
`;

const BannerSubtitle = styled.p`
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.secondary};
    opacity: 0.9;
    margin-top: 0.25rem;
`;

const BatchPill = styled.span`
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.secondary};
    font-size: 0.75rem;
    font-weight: 700;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    white-space: nowrap;
`;

const PulseDot = styled.span`
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.secondary};
    display: inline-block;
    animation: ${pulseRing} 2s infinite ease-in-out;
`;

// --- 2-Column Grid ---
const ContentGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;

    ${media.desktop} {
        grid-template-columns: 7fr 5fr;
    }
`;

// --- Left & Right Column Sections ---
const ColumnSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

// --- Card Shell ---
const ContentCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    padding: 1.25rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

    ${media.desktop} {
        padding: 1.5rem;
    }
`;

// --- Store Counter Verification Card ---
const VerificationHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainer};
`;

const VerificationGrid = styled.div`
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    align-items: center;

    ${media.desktop} {
        grid-template-columns: 7fr 5fr;
    }
`;

const PinBoxContainer = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: 0.75rem;
    padding: 1.25rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
`;

const PinDisplayRow = styled.div`
    margin: 0.75rem 0;
    padding: 0.75rem 1rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.5rem;
    border: 2px solid ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const PinCodeText = styled.span`
    font-size: 1.75rem;
    font-weight: 800;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.15em;
    color: ${({ theme }) => theme.colors.primary};
`;

const CopyButton = styled.button<{ $copied?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    border: none;
    background: ${({ $copied, theme }) =>
        $copied ? theme.colors.successContainer : theme.colors.primaryLight};
    color: ${({ $copied, theme }) => ($copied ? theme.colors.secondary : theme.colors.rust)};
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
        transform: scale(0.95);
    }
`;

const QrBoxContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    text-align: center;
`;

const QrCodeWrapper = styled.div`
    width: 8.5rem;
    height: 8.5rem;
    background: #ffffff;
    padding: 0.5rem;
    border-radius: 0.75rem;
    border: 2px solid ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
`;

const QrCenterBolt = styled.div`
    position: absolute;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.primary};
`;

// --- Live Order Progress Stepper ---
const TimelineStepper = styled.div`
    position: relative;
    padding-left: 2rem;
    margin-top: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;

    &::before {
        content: '';
        position: absolute;
        left: 0.875rem;
        top: 0.75rem;
        bottom: 0.75rem;
        width: 2px;
        background: ${({ theme }) => theme.colors.borderSubtle};
    }
`;

const StepItem = styled.div<{ $status: 'done' | 'active' | 'pending' }>`
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
`;

const StepIcon = styled.div<{ $status: 'done' | 'active' | 'pending' }>`
    position: absolute;
    left: -2rem;
    width: 1.875rem;
    height: 1.875rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.surfaceContainerLowest};
    background: ${({ $status, theme }) =>
        $status === 'done'
            ? theme.colors.secondary
            : $status === 'active'
              ? theme.colors.primary
              : theme.colors.surfaceContainerHighest};
    color: ${({ $status, theme }) =>
        $status === 'done'
            ? theme.colors.textOnSecondary
            : $status === 'active'
              ? theme.colors.textOnPrimary
              : theme.colors.textMuted};
`;

const StepBox = styled.div<{ $active?: boolean }>`
    flex: 1;
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid
        ${({ $active, theme }) =>
            $active ? theme.colors.borderOutlineVariant : theme.colors.borderSubtle};
    background: ${({ $active }) =>
        $active ? 'rgba(255, 87, 51, 0.05)' : 'rgba(244, 242, 253, 0.6)'};
`;

const SpinningIcon = styled.span`
    display: inline-block;
    animation: ${spin} 2s linear infinite;
`;

// --- Pickup Location Card ---
const LocationIconBox = styled.div`
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const MapPreview = styled.div`
    margin-top: 1rem;
    height: 10.5rem;
    border-radius: 0.75rem;
    overflow: hidden;
    position: relative;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: ${({ theme }) => theme.colors.surfaceContainer};

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const MapOverlayBanner = styled.div`
    position: absolute;
    bottom: 0.625rem;
    left: 0.625rem;
    right: 0.625rem;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(4px);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.75rem;
`;

const ActionButtonGroup = styled.div`
    margin-top: 1rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
`;

const ActionButton = styled.a<{ $primary?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 700;
    text-decoration: none;
    border: 1px solid
        ${({ $primary, theme }) => ($primary ? 'transparent' : theme.colors.borderSubtle)};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.primary : 'transparent')};
    color: ${({ $primary, theme }) =>
        $primary ? theme.colors.textOnPrimary : theme.colors.textPrimary};
    transition: all 0.15s;

    &:hover {
        background: ${({ $primary, theme }) =>
            $primary ? theme.colors.primaryDark : theme.colors.surfaceContainer};
    }
    &:active {
        transform: scale(0.98);
    }
`;

// --- Order Summary Card ---
const ItemThumbnail = styled.div`
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    padding: 0.25rem;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;

const PriceRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const TotalRow = styled.div`
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const PrimaryCtaButton = styled.button`
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 9999px;
    border: none;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
    &:active {
        transform: scale(0.98);
    }
`;

const SecondaryCtaButton = styled(Link)`
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background: transparent;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s;

    &:hover {
        background: rgba(255, 87, 51, 0.08);
    }
    &:active {
        transform: scale(0.98);
    }
`;

// --- Desktop Footer ---
const DesktopFooter = styled.footer`
    display: none;

    ${media.desktop} {
        display: block;
        margin-top: 4rem;
        background: ${({ theme }) => theme.colors.surfaceContainer};
        border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        padding: 3rem 2rem 2rem;
    }
`;

const FooterInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
`;

// ==================== MAIN COMPONENT ====================

export function CustomerOrderDetailPage() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const orderQuery = useQuery({
        queryKey: ['customer-order', orderId],
        queryFn: () => apiClient.getOwnOrder(orderId!),
        enabled: !!orderId,
    });

    const isPickup = orderQuery.data?.fulfilment_type === 'PICKUP';
    const isDelivery = orderQuery.data?.fulfilment_type === 'DELIVERY';

    const pickupCodeQuery = useQuery({
        queryKey: ['customer-pickup-code', orderId],
        queryFn: () => apiClient.getOwnPickupCode(orderId!),
        enabled: !!orderId && isPickup && orderQuery.data?.status === 'READY',
        retry: false,
    });

    const deliveryStatusQuery = useQuery({
        queryKey: ['customer-delivery-status', orderId],
        queryFn: () => apiClient.getOwnDeliveryStatus(orderId!),
        enabled: !!orderId && isDelivery,
        refetchInterval: 15_000,
    });

    const deliveryCodeQuery = useQuery({
        queryKey: ['customer-delivery-code', orderId],
        queryFn: () => apiClient.getOwnDeliveryCode(orderId!),
        enabled: !!orderId && orderQuery.data?.status === 'OUT_FOR_DELIVERY',
        retry: false,
    });

    if (orderQuery.isLoading) {
        return (
            <PageContainer>
                <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                    <LoadingState label="Loading order" />
                </div>
            </PageContainer>
        );
    }

    if (orderQuery.isError || !orderQuery.data) {
        return (
            <PageContainer>
                <div style={{ padding: '3rem 1rem' }}>
                    <ErrorState
                        title="Order not found"
                        description="Could not load this order. Please verify your order number and try again."
                    />
                </div>
            </PageContainer>
        );
    }

    const order = orderQuery.data;
    const storeName = order.store_name_snapshot || 'Maa Tara Groceries';
    const storeAddress =
        order.store_address_snapshot ||
        'Station Road, Badarpur (Near Old Cinema Hall), Karimganj Dist, Assam 788806';

    // Display PIN: either real pickup PIN if available, or reference code DZ-XXXX
    const displayPin =
        pickupCodeQuery.data?.code || `DZ-${order.order_number.replace(/[^0-9]/g, '').slice(-4)}`;

    const handleCopyPin = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(displayPin).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
            });
        }
    };

    // Calculate status progress index
    // 0: Placed, 1: Accepted, 2: Packing (Preparing), 3: Ready, 4: Completed
    let stepIndex = 0;
    if (order.status === 'ACCEPTED') stepIndex = 1;
    else if (order.status === 'PREPARING') stepIndex = 2;
    else if (
        order.status === 'READY' ||
        order.status === 'ASSIGNED' ||
        order.status === 'PICKED_UP' ||
        order.status === 'OUT_FOR_DELIVERY'
    )
        stepIndex = 3;
    else if (order.status === 'COMPLETED' || order.status === 'DELIVERED') stepIndex = 4;

    const itemCount = order.items ? order.items.length : 0;
    const subtotal = Number(order.subtotal || order.total_amount);
    const totalAmount = Number(order.total_amount);

    return (
        <PageContainer>
            {/* DESKTOP TOP APP BAR */}
            <DesktopHeader>
                <DesktopHeaderInner>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <BrandLink to="/">
                            <BrandIcon>
                                <span className="material-symbols-outlined">electric_bolt</span>
                            </BrandIcon>
                            <BrandHeading>Dropzo</BrandHeading>
                        </BrandLink>
                        <StorePinBadge>
                            <span
                                className="material-symbols-outlined"
                                style={{ color: '#FF5733' }}
                            >
                                storefront
                            </span>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                    Badarpur Central Hub
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.6875rem',
                                        color: '#006E2D',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#006E2D',
                                            display: 'inline-block',
                                        }}
                                    />
                                    Pickup Ready Desk Active
                                </div>
                            </div>
                        </StorePinBadge>
                    </div>

                    <DesktopNav>
                        <Link to="/">Fresh Produce</Link>
                        <Link to="/">Dairy & Eggs</Link>
                        <Link to="/">Local Pantry</Link>
                        <Link to="/">Snacks</Link>
                        <Link to="/" style={{ color: '#B72301', fontWeight: 700 }}>
                            Daily Offers
                        </Link>
                    </DesktopNav>

                    <HeaderActions>
                        <ModeBadge>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 16, color: '#FF5733' }}
                            >
                                {isDelivery ? 'local_shipping' : 'shopping_bag'}
                            </span>
                            {isDelivery ? 'Express Delivery' : 'Counter Pickup'}
                        </ModeBadge>
                        <IconButton aria-label="Notifications">
                            <span className="material-symbols-outlined">notifications</span>
                        </IconButton>
                        <IconButton aria-label="Store Location">
                            <span className="material-symbols-outlined">location_on</span>
                        </IconButton>
                        <Link
                            to="/checkout"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: 9999,
                                background: '#FF5733',
                                color: '#ffffff',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                            }}
                        >
                            <span className="material-symbols-outlined">shopping_basket</span>
                            <span>Cart (₹{totalAmount})</span>
                        </Link>
                    </HeaderActions>
                </DesktopHeaderInner>
            </DesktopHeader>

            {/* MOBILE TOP BAR */}
            <MobileTopBar>
                <IconButton onClick={() => navigate('/orders')} aria-label="Back to orders">
                    <span className="material-symbols-outlined">arrow_back</span>
                </IconButton>
                <div style={{ textAlign: 'center' }}>
                    <span
                        style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            color: '#8F7069',
                            display: 'block',
                        }}
                    >
                        {isDelivery ? 'DELIVERY ORDER' : 'PICKUP ORDER'}
                    </span>
                    <OrderIdHeading>Order #{order.order_number}</OrderIdHeading>
                </div>
                <IconButton aria-label="Share receipt">
                    <span className="material-symbols-outlined">share</span>
                </IconButton>
            </MobileTopBar>

            {/* SUB-HEADER BAR */}
            <SubHeaderBar>
                <SubHeaderInner>
                    <SubHeaderLeft>
                        <IconButton
                            onClick={() => navigate('/orders')}
                            aria-label="Back"
                            style={{ display: 'none' }}
                            className="desktop-back"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </IconButton>
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <OrderIdHeading>Order #{order.order_number}</OrderIdHeading>
                                <StatusPill $variant={isPickup ? 'secondary' : 'warning'}>
                                    {order.status === 'READY'
                                        ? 'Ready for Pickup'
                                        : order.status === 'COMPLETED'
                                          ? 'Picked Up'
                                          : isPickup
                                            ? 'Active Pickup'
                                            : 'Delivery Order'}
                                </StatusPill>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#5B403A', marginTop: 2 }}>
                                {isPickup ? 'Self-Pickup Fulfillment' : 'Home Delivery'} • Placed at{' '}
                                {new Date(order.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </SubHeaderLeft>

                    <SubHeaderRight>
                        <PickupWindowPill>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 16, color: '#006E2D' }}
                            >
                                schedule
                            </span>
                            {isPickup
                                ? 'Estimated Counter Pickup: Today (~25 mins)'
                                : 'Estimated Delivery: Today (~30 mins)'}
                        </PickupWindowPill>
                        <InvoiceButton onClick={() => window.print()}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                receipt_long
                            </span>
                            Invoice
                        </InvoiceButton>
                    </SubHeaderRight>
                </SubHeaderInner>
            </SubHeaderBar>

            {/* MAIN CANVAS */}
            <MainCanvas>
                {/* CONFIRMATION BANNER */}
                <ConfirmationBanner>
                    <BannerContent>
                        <CheckCircleIcon>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
                            >
                                check_circle
                            </span>
                        </CheckCircleIcon>
                        <div>
                            <BannerTitle>
                                Order Confirmed with {storeName}!{' '}
                                {isPickup ? 'Pickup: Today' : 'Delivery: Today'}
                            </BannerTitle>
                            <BannerSubtitle>
                                Your items are reserved and the merchant has already started
                                packaging fresh stock at Station Road counter.
                            </BannerSubtitle>
                        </div>
                    </BannerContent>
                    <BatchPill>
                        <PulseDot />
                        Readying Batch #
                        {order.order_number.replace(/[^0-9]/g, '').slice(-4) || '8492'}
                    </BatchPill>
                </ConfirmationBanner>

                {/* 2 PRIMARY COLUMNS */}
                <ContentGrid>
                    {/* LEFT COLUMN: Verification & Progress */}
                    <ColumnSection>
                        {/* STORE COUNTER VERIFICATION CARD */}
                        <ContentCard>
                            <VerificationHeader>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.625rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '2rem',
                                            height: '2rem',
                                            borderRadius: '0.5rem',
                                            background: '#FFDAD3',
                                            color: '#B72301',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <span className="material-symbols-outlined">
                                            verified_user
                                        </span>
                                    </div>
                                    <div>
                                        <h3
                                            style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 700,
                                                margin: 0,
                                            }}
                                        >
                                            Store Counter Verification
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                margin: 0,
                                            }}
                                        >
                                            Present either the 6-Digit PIN or QR code at pickup
                                        </p>
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        padding: '0.25rem 0.625rem',
                                        borderRadius: 9999,
                                        background: '#CCE5FF',
                                        color: '#002D48',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 14 }}
                                    >
                                        security
                                    </span>
                                    Encrypted POS Sync
                                </span>
                            </VerificationHeader>

                            <VerificationGrid>
                                {/* PIN Box */}
                                <PinBoxContainer>
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 800,
                                                    letterSpacing: '0.05em',
                                                    textTransform: 'uppercase',
                                                    color: '#5B403A',
                                                }}
                                            >
                                                YOUR 6-DIGIT PICKUP PIN
                                            </span>
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
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        background: '#006E2D',
                                                    }}
                                                />
                                                Verified Code
                                            </span>
                                        </div>

                                        <PinDisplayRow>
                                            <PinCodeText id="pickupPinCode">
                                                {displayPin}
                                            </PinCodeText>
                                            <CopyButton
                                                onClick={handleCopyPin}
                                                $copied={copied}
                                                title="Copy PIN to clipboard"
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: 16 }}
                                                >
                                                    {copied ? 'done' : 'content_copy'}
                                                </span>
                                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                                            </CopyButton>
                                        </PinDisplayRow>
                                    </div>

                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            margin: 0,
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.375rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: 16, color: '#B72301' }}
                                        >
                                            info
                                        </span>
                                        <span>
                                            Show this code to the store counter staff at{' '}
                                            <strong>{storeName}</strong> upon arrival for instant
                                            bag release.
                                        </span>
                                    </p>
                                </PinBoxContainer>

                                {/* QR Code Box */}
                                <QrBoxContainer>
                                    <QrCodeWrapper>
                                        <svg
                                            viewBox="0 0 100 100"
                                            fill="currentColor"
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            <path d="M5 5 h30 v30 h-30 z M10 10 v20 h20 v-20 z M15 15 h10 v10 h-10 z" />
                                            <path d="M65 5 h30 v30 h-30 z M70 10 v20 h20 v-20 z M75 15 h10 v10 h-10 z" />
                                            <path d="M5 65 h30 v30 h-30 z M10 70 v20 h20 v-20 z M15 75 h10 v10 h-10 z" />
                                            <rect x="42" y="10" width="6" height="6" />
                                            <rect x="52" y="10" width="6" height="12" />
                                            <rect x="42" y="24" width="16" height="6" />
                                            <rect x="10" y="42" width="6" height="14" />
                                            <rect x="22" y="42" width="12" height="6" />
                                            <rect x="22" y="52" width="6" height="6" />
                                            <rect
                                                x="42"
                                                y="42"
                                                width="16"
                                                height="16"
                                                fill="#B72301"
                                            />
                                            <rect x="65" y="42" width="8" height="6" />
                                            <rect x="80" y="42" width="14" height="6" />
                                            <rect x="70" y="52" width="16" height="8" />
                                            <rect x="42" y="65" width="8" height="12" />
                                            <rect x="54" y="70" width="14" height="6" />
                                            <rect x="42" y="82" width="26" height="8" />
                                            <rect x="75" y="68" width="8" height="14" />
                                            <rect x="86" y="86" width="8" height="8" />
                                        </svg>
                                        <QrCenterBolt>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: 16 }}
                                            >
                                                electric_bolt
                                            </span>
                                        </QrCenterBolt>
                                    </QrCodeWrapper>
                                    <span
                                        style={{
                                            marginTop: '0.625rem',
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Scan for Instant Match
                                    </span>
                                    <span
                                        style={{
                                            marginTop: '0.25rem',
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: 9999,
                                            background: '#7CF994',
                                            color: '#005320',
                                        }}
                                    >
                                        Single-use • Valid 48h
                                    </span>
                                </QrBoxContainer>
                            </VerificationGrid>

                            <div
                                style={{
                                    marginTop: '1rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #EEEDF7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: '#5B403A',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 16, color: '#006E2D' }}
                                    >
                                        task_alt
                                    </span>
                                    No paper invoice needed. Identity confirmed digitally at POS
                                    terminal.
                                </span>
                            </div>
                        </ContentCard>

                        {/* LIVE ORDER PROGRESS STEPPER */}
                        <ContentCard>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            margin: 0,
                                        }}
                                    >
                                        Live Order Progress
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            margin: 0,
                                        }}
                                    >
                                        Real-time status synced with Badarpur Hub terminal
                                    </p>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                    }}
                                >
                                    <PulseDot />
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#006E2D',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Live Status: {order.status}
                                    </span>
                                </div>
                            </div>

                            <TimelineStepper>
                                {/* Step 1: Order Placed */}
                                <StepItem $status={stepIndex >= 0 ? 'done' : 'pending'}>
                                    <StepIcon $status={stepIndex >= 0 ? 'done' : 'pending'}>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: 16 }}
                                        >
                                            check
                                        </span>
                                    </StepIcon>
                                    <StepBox>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.875rem' }}>
                                                Order Placed
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                {new Date(order.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                marginTop: 4,
                                            }}
                                        >
                                            Order logged via Dropzo and assigned to {storeName}{' '}
                                            inventory desk.
                                        </p>
                                    </StepBox>
                                </StepItem>

                                {/* Step 2: Accepted by Merchant */}
                                <StepItem $status={stepIndex >= 1 ? 'done' : 'pending'}>
                                    <StepIcon $status={stepIndex >= 1 ? 'done' : 'pending'}>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: 16 }}
                                        >
                                            {stepIndex >= 1 ? 'check' : 'hourglass_empty'}
                                        </span>
                                    </StepIcon>
                                    <StepBox>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.875rem' }}>
                                                Accepted by Merchant
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                {stepIndex >= 1 ? 'Verified' : 'Pending'}
                                            </span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                marginTop: 4,
                                            }}
                                        >
                                            {storeName} counter verified item weights and stock
                                            availability.
                                        </p>
                                    </StepBox>
                                </StepItem>

                                {/* Step 3: Merchant is Packing Items */}
                                <StepItem
                                    $status={
                                        stepIndex > 2
                                            ? 'done'
                                            : stepIndex === 2
                                              ? 'active'
                                              : 'pending'
                                    }
                                >
                                    <StepIcon
                                        $status={
                                            stepIndex > 2
                                                ? 'done'
                                                : stepIndex === 2
                                                  ? 'active'
                                                  : 'pending'
                                        }
                                    >
                                        {stepIndex > 2 ? (
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: 16 }}
                                            >
                                                check
                                            </span>
                                        ) : stepIndex === 2 ? (
                                            <SpinningIcon className="material-symbols-outlined">
                                                progress_activity
                                            </SpinningIcon>
                                        ) : (
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: 16 }}
                                            >
                                                inventory_2
                                            </span>
                                        )}
                                    </StepIcon>
                                    <StepBox $active={stepIndex === 2}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <strong
                                                style={{
                                                    fontSize: '0.875rem',
                                                    color: stepIndex === 2 ? '#B72301' : 'inherit',
                                                }}
                                            >
                                                Merchant is Packing Items
                                            </strong>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    color: stepIndex === 2 ? '#B72301' : '#5B403A',
                                                }}
                                            >
                                                {stepIndex === 2
                                                    ? 'In Progress'
                                                    : stepIndex > 2
                                                      ? 'Packed'
                                                      : 'Pending'}
                                            </span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                marginTop: 4,
                                            }}
                                        >
                                            {itemCount} items are being bagged with tamper-evident
                                            seal and counter barcode tag.
                                        </p>
                                        {stepIndex === 2 && (
                                            <div
                                                style={{
                                                    marginTop: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        background: '#EEEDF7',
                                                        height: 6,
                                                        borderRadius: 9999,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: '75%',
                                                            background: '#FF5733',
                                                            height: '100%',
                                                            borderRadius: 9999,
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    75% Packed
                                                </span>
                                            </div>
                                        )}
                                    </StepBox>
                                </StepItem>

                                {/* Step 4: Ready at Counter */}
                                <StepItem
                                    $status={
                                        stepIndex >= 3
                                            ? stepIndex > 3
                                                ? 'done'
                                                : 'active'
                                            : 'pending'
                                    }
                                >
                                    <StepIcon
                                        $status={
                                            stepIndex >= 3
                                                ? stepIndex > 3
                                                    ? 'done'
                                                    : 'active'
                                                : 'pending'
                                        }
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: 16 }}
                                        >
                                            storefront
                                        </span>
                                    </StepIcon>
                                    <StepBox $active={stepIndex === 3}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <strong style={{ fontSize: '0.875rem' }}>
                                                Ready at Counter for Pickup
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                {stepIndex >= 3 ? 'Ready Now' : '~5:45 PM'}
                                            </span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                marginTop: 4,
                                            }}
                                        >
                                            SMS and push notification will ping as soon as bag
                                            reaches Pickup Shelves #C-12.
                                        </p>
                                    </StepBox>
                                </StepItem>
                            </TimelineStepper>

                            {/* Slot indicator */}
                            <div
                                style={{
                                    marginTop: '1.5rem',
                                    background: '#EEEDF7',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 18, color: '#B72301' }}
                                    >
                                        alarm
                                    </span>
                                    <span>
                                        Pickup Slot Window:{' '}
                                        <strong>5:45 PM – 7:30 PM (Today)</strong>
                                    </span>
                                </div>
                                <button
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#B72301',
                                        fontWeight: 700,
                                        fontSize: '0.6875rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Extend Pickup Slot
                                </button>
                            </div>
                        </ContentCard>

                        {/* DELIVERY PROGRESS (For Home Delivery Orders) */}
                        {isDelivery && (
                            <ContentCard>
                                <h3
                                    style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 700,
                                        margin: '0 0 1rem',
                                    }}
                                >
                                    Delivery Progress & Partner
                                </h3>
                                {deliveryStatusQuery.data?.assignment ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.5rem',
                                                background: '#F4F2FD',
                                                border: '1px solid #E3E1EC',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                                Delivery Partner Assigned:
                                            </span>
                                            <div
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: 700,
                                                    marginTop: 2,
                                                }}
                                            >
                                                {deliveryStatusQuery.data.assignment.partnerName ||
                                                    'Dropzo Courier'}
                                            </div>
                                            <a
                                                href={`tel:${deliveryStatusQuery.data.assignment.partnerPhone}`}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    color: '#B72301',
                                                    fontWeight: 700,
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    marginTop: 4,
                                                }}
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: 14 }}
                                                >
                                                    call
                                                </span>
                                                {deliveryStatusQuery.data.assignment.partnerPhone}
                                            </a>
                                        </div>

                                        {deliveryCodeQuery.data?.code && (
                                            <div
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    background: '#FFDAD3',
                                                    border: '1px solid #FFB4A4',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: '#B72301',
                                                    }}
                                                >
                                                    Delivery Verification PIN
                                                </span>
                                                <div
                                                    style={{
                                                        fontSize: '1.5rem',
                                                        fontWeight: 800,
                                                        fontFamily: 'monospace',
                                                        color: '#3D0600',
                                                    }}
                                                >
                                                    {deliveryCodeQuery.data.code}
                                                </div>
                                                <p
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        color: '#580C00',
                                                        margin: '4px 0 0',
                                                    }}
                                                >
                                                    Share this PIN with the delivery partner only
                                                    upon receiving your items.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p
                                        style={{
                                            fontSize: '0.875rem',
                                            color: '#5B403A',
                                            margin: 0,
                                        }}
                                    >
                                        Waiting for a delivery partner to be assigned.
                                    </p>
                                )}
                            </ContentCard>
                        )}
                    </ColumnSection>

                    {/* RIGHT COLUMN: Store Info & Order Summary */}
                    <ColumnSection>
                        {/* PICKUP LOCATION CARD */}
                        <ContentCard>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.05em',
                                        color: '#5B403A',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    PICKUP LOCATION
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        color: '#006E2D',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 14 }}
                                    >
                                        near_me
                                    </span>
                                    0.8 km away
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.875rem',
                                }}
                            >
                                <LocationIconBox>
                                    <span className="material-symbols-outlined">store</span>
                                </LocationIconBox>
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            margin: 0,
                                        }}
                                    >
                                        {storeName}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            marginTop: 2,
                                        }}
                                    >
                                        {storeAddress}
                                    </p>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginTop: '0.375rem',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: '0.25rem',
                                                background: '#7CF994',
                                                color: '#005320',
                                            }}
                                        >
                                            Open till 9:30 PM
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Counter #2: Quick Collect
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <MapPreview>
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCN_WEaXyv8q_25SHdXAAyC_5OBj6Hve5BadtXVa5iBF6d8kyO4DomJxhG_PyEQmF8cRNOI4vBWjR6oM_ScsOpX-LEE9V2xdxJ5Jz6q0P4x-4F6DjCbG0EPs_PxPdQCKcE2qilPAz7JUB09qHNbYSmq844RCbaeAE_UIc7nb_IVKXaQLN6wuHiVybVHZwYuX2-c7LBp-NWuug3qigjI_SSg-hP3DexwW_YmMGRaecY"
                                    alt="Badarpur Station Road Store Map"
                                />
                                <MapOverlayBanner>
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: 16, color: '#B72301' }}
                                        >
                                            pin_drop
                                        </span>
                                        Station Road Hub Gate 1
                                    </span>
                                    <span style={{ color: '#5B403A' }}>Walking: 7 min</span>
                                </MapOverlayBanner>
                            </MapPreview>

                            <ActionButtonGroup>
                                <ActionButton href="tel:+919876543210">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 16, color: '#B72301' }}
                                    >
                                        call
                                    </span>
                                    <span>Call Shop</span>
                                </ActionButton>
                                <ActionButton
                                    href="https://maps.google.com?q=Badarpur,Assam"
                                    target="_blank"
                                    rel="noreferrer"
                                    $primary
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 16 }}
                                    >
                                        directions
                                    </span>
                                    <span>Directions</span>
                                </ActionButton>
                            </ActionButtonGroup>
                        </ContentCard>

                        {/* ORDER SUMMARY CARD */}
                        <ContentCard>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingBottom: '0.75rem',
                                    borderBottom: '1px solid #E3E1EC',
                                }}
                            >
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 700,
                                            margin: 0,
                                        }}
                                    >
                                        Order Summary
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                        {itemCount} Items in bag
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: 9999,
                                        background: '#EEEDF7',
                                    }}
                                >
                                    Cash/UPI Counter
                                </span>
                            </div>

                            {/* Item Rows */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    marginTop: '0.75rem',
                                }}
                            >
                                {order.items?.map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '0.75rem',
                                            paddingBottom: '0.5rem',
                                            borderBottom: '1px solid #F4F2FD',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                            }}
                                        >
                                            <ItemThumbnail>
                                                <img
                                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEYErDTFOAjMph3xNRrG58f79w5jQgVxqM4nqcRwwPZMpm73htOKrRuDSDOr-40D9YelHxUo6tp5wdkuvm8Co6ZIMpBzAcROX6wLiFjXKFYsD8pWO97wLy6F5Mx0K79kuAk4IEMnI6m1opEeFUtiHQoCDDYP_EMZbG4S2kgfg-v4wkAmqp3BYoiOszVpNnxc_Yq2inqvL1FnenPVUhQu22RyTnlNRejvx1xSxtacY"
                                                    alt={item.product_name_snapshot}
                                                />
                                            </ItemThumbnail>
                                            <div>
                                                <h5
                                                    style={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 700,
                                                        margin: 0,
                                                    }}
                                                >
                                                    {item.product_name_snapshot}
                                                </h5>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.375rem',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.625rem',
                                                            padding: '0.125rem 0.25rem',
                                                            borderRadius: '0.25rem',
                                                            background: '#EEEDF7',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        {item.variant_snapshot || 'Standard'}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        Qty: {item.quantity}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                            ₹{Number(item.unit_price) * Number(item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Price Breakdown */}
                            <div
                                style={{
                                    marginTop: '0.75rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #E3E1EC',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                }}
                            >
                                <PriceRow>
                                    <span>Subtotal</span>
                                    <strong style={{ color: '#1A1B22' }}>₹{subtotal}</strong>
                                </PriceRow>
                                <PriceRow>
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                        }}
                                    >
                                        Store Pickup Convenience Fee
                                    </span>
                                    <strong style={{ color: '#006E2D' }}>FREE</strong>
                                </PriceRow>
                                <PriceRow>
                                    <span>Payment Mode</span>
                                    <span>Pay at Counter (Cash/UPI)</span>
                                </PriceRow>

                                <TotalRow>
                                    <div>
                                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                                            Total Amount Due
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                            Pay when collecting items
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: 800,
                                            color: '#B72301',
                                        }}
                                    >
                                        ₹{totalAmount}
                                    </span>
                                </TotalRow>
                            </div>

                            {/* Action CTA Buttons */}
                            <div
                                style={{
                                    marginTop: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.625rem',
                                }}
                            >
                                <PrimaryCtaButton onClick={() => navigate('/orders')}>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 18 }}
                                    >
                                        list_alt
                                    </span>
                                    <span>View All Orders</span>
                                </PrimaryCtaButton>
                                <SecondaryCtaButton to="/">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 18 }}
                                    >
                                        shopping_basket
                                    </span>
                                    <span>Continue Shopping</span>
                                </SecondaryCtaButton>

                                <p
                                    style={{
                                        fontSize: '0.75rem',
                                        color: '#5B403A',
                                        textAlign: 'center',
                                        marginTop: '0.5rem',
                                        margin: 0,
                                    }}
                                >
                                    Need help with your pickup?{' '}
                                    <a
                                        href="#support"
                                        style={{
                                            color: '#B72301',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Contact Dropzo Support
                                    </a>
                                </p>
                            </div>
                        </ContentCard>
                    </ColumnSection>
                </ContentGrid>
            </MainCanvas>

            {/* DESKTOP FOOTER */}
            <DesktopFooter>
                <FooterInner>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 800,
                                    color: '#B72301',
                                }}
                            >
                                Dropzo
                            </span>
                            <p
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#5B403A',
                                    maxWidth: 450,
                                    marginTop: 4,
                                }}
                            >
                                Next-generation hyper-local grocery and farm fulfillment network
                                operating directly from local agro-producers and verified station
                                merchants across Assam.
                            </p>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: '#FFFFFF',
                                borderRadius: '0.75rem',
                                border: '1px solid #E3E1EC',
                            }}
                        >
                            <div
                                style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '50%',
                                    background: '#7FFC97',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#002109',
                                }}
                            >
                                <span className="material-symbols-outlined">hub</span>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                    Badarpur Hub Logistics Desk
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        color: '#006E2D',
                                        fontWeight: 600,
                                    }}
                                >
                                    15-minute quick delivery • 0 min counter pick
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            paddingTop: '1rem',
                            borderTop: '1px solid #E3E1EC',
                            fontSize: '0.75rem',
                            color: '#5B403A',
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem',
                        }}
                    >
                        <span>
                            © 2026 Dropzo Technologies Pvt Ltd. Serving Badarpur, Karimganj, Assam.
                        </span>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <span>English (India)</span>
                            <span>•</span>
                            <span>Assamese</span>
                            <span>•</span>
                            <span>Bengali</span>
                        </div>
                    </div>
                </FooterInner>
            </DesktopFooter>
        </PageContainer>
    );
}
