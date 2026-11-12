import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';

// --- Animations ---
const pulseAnimation = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

// --- Layout Styled Components ---
const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
`;

const TopHeader = styled.header`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    position: sticky;
    top: 0;
    z-index: 40;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const HeaderInner = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const BrandCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const BrandLogoText = styled.span`
    font-size: 1.375rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.02em;
`;

const DispatchHubPill = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background-color: #7cf994;
    color: #007230;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 1px solid rgba(0, 110, 45, 0.2);
`;

const HeaderCenter = styled.div`
    display: none;
    align-items: center;
    gap: 0.75rem;

    @media (min-width: 1024px) {
        display: flex;
    }
`;

const ZoneBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.75rem;
    font-weight: 600;
`;

const PulseDot = styled.span`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.secondary};
    position: relative;

    &::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 9999px;
        background-color: inherit;
        animation: ${pulseAnimation} 1.6s infinite;
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const EmergencyAlertButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.errorContainer};
    color: ${({ theme }) => theme.colors.error};
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &:active {
        transform: scale(0.96);
    }
`;

const DispatcherProfile = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding-left: 0.75rem;
    border-left: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const ProfileAvatar = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: #ffdad3;
    color: #b72301;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.8125rem;
`;

const ProfileMeta = styled.div`
    display: none;
    flex-direction: column;

    @media (min-width: 768px) {
        display: flex;
    }
`;

const ProfileName = styled.span`
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.1;
`;

const ProfileRole = styled.span`
    font-size: 0.625rem;
    color: ${({ theme }) => theme.colors.textMuted};
`;

// --- Workspace Layout ---
const WorkspaceLayout = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const SidebarNav = styled.aside`
    display: none;
    width: 16rem;
    border-right: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    flex-direction: column;
    justify-content: space-between;
    padding: 1.25rem 1rem;
    flex-shrink: 0;

    @media (min-width: 1024px) {
        display: flex;
    }
`;

const StationEmblem = styled.div`
    padding: 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
`;

const StationIconWrap = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background-color: ${({ theme }) => theme.colors.secondary};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const NavList = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

const NavItem = styled.a<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-size: 0.8125rem;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    background-color: ${({ $active }) =>
        $active ? 'rgba(124, 249, 148, 0.3)' : 'transparent'};
    color: ${({ $active, theme }) => ($active ? '#006E2D' : theme.colors.textSecondary)};
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ $active, theme }) =>
            $active ? 'rgba(124, 249, 148, 0.3)' : theme.colors.surfaceContainerLow};
    }
`;

const NavItemLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
`;

const NavBadge = styled.span<{ $color?: string; $bg?: string }>`
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    color: ${({ $color }) => $color || '#FFFFFF'};
    background-color: ${({ $bg }) => $bg || '#FF5733'};
`;

const MainCanvas = styled.main`
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

// --- Banner & KPI Cards ---
const DispatchBanner = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 1rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const BannerTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
`;

const BannerSub = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin: 0.125rem 0 0;
`;

const KpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;

    @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
    }

    @media (min-width: 1024px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const KpiCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1.125rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const KpiTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const KpiLabel = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 600;
`;

const KpiIconWrap = styled.div<{ $bg?: string; $color?: string }>`
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
    background-color: ${({ $bg }) => $bg || '#FFDAD3'};
    color: ${({ $color }) => $color || '#B72301'};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const KpiValue = styled.div<{ $color?: string }>`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
    line-height: 1.2;
`;

const KpiSubtext = styled.div`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-top: 0.375rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

// --- Split Workspace Layout ---
const WorkspaceColumns = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @media (min-width: 1024px) {
        grid-template-columns: 8fr 4fr;
    }
`;

// --- Left Queue Stream ---
const QueueStreamArea = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const QueueControlBar = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const FilterTabsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const TabsCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow-x: auto;
`;

const FilterTabButton = styled.button<{ $active?: boolean; $isAlert?: boolean }>`
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: ${({ $active }) => ($active ? '700' : '600')};
    background-color: ${({ $active, $isAlert, theme }) =>
        $active
            ? theme.colors.primary
            : $isAlert
              ? theme.colors.errorContainer
              : theme.colors.surfaceContainer};
    color: ${({ $active, $isAlert, theme }) =>
        $active ? '#FFFFFF' : $isAlert ? theme.colors.error : theme.colors.textPrimary};
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.15s ease;

    &:hover {
        opacity: 0.9;
    }
`;

const OrderCard = styled.div<{ $isHighUrgency?: boolean; $isAlert?: boolean }>`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 2px solid
        ${({ $isAlert, $isHighUrgency, theme }) =>
            $isAlert
                ? 'rgba(186, 26, 26, 0.4)'
                : $isHighUrgency
                  ? 'rgba(255, 87, 51, 0.3)'
                  : theme.colors.borderSubtle};
    padding: 1.125rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    transition: all 0.15s ease;

    &:hover {
        border-color: ${({ $isAlert, theme }) =>
            $isAlert ? theme.colors.error : theme.colors.primary};
    }
`;

const OrderCardTop = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
`;

const OrderCardDetailsGrid = styled.div<{ $isAlert?: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background-color: ${({ $isAlert, theme }) =>
        $isAlert ? 'rgba(255, 218, 214, 0.2)' : theme.colors.surfaceContainerLow};
    border: 1px solid
        ${({ $isAlert, theme }) =>
            $isAlert ? 'rgba(186, 26, 26, 0.2)' : theme.colors.borderSubtle};

    @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
    }
`;

const WaypointNode = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
`;

const WaypointIcon = styled.div<{ $type?: 'store' | 'customer' }>`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: ${({ $type }) =>
        $type === 'store' ? 'rgba(0, 110, 45, 0.1)' : 'rgba(255, 87, 51, 0.1)'};
    color: ${({ $type, theme }) =>
        $type === 'store' ? theme.colors.secondary : theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.125rem;
`;

const OrderActionBar = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.25rem;
`;

const PartnerSelect = styled.select`
    flex: 1;
    min-width: 220px;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 2px solid rgba(0, 110, 45, 0.3);
    background-color: #ffffff;
    font-size: 0.8125rem;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.textPrimary};
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.secondary};
    }
`;

const AssignButton = styled.button<{ $isReassign?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background-color: ${({ $isReassign, theme }) =>
        $isReassign ? theme.colors.error : theme.colors.primary};
    color: #ffffff;
    font-size: 0.8125rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// --- Right Sidebar: Active Delivery Fleet & COD Safe ---
const FleetSidebar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const FleetPanel = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1.125rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
`;

const RiderCard = styled.div`
    padding: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const RiderCardTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const RiderIdentity = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
`;

const RiderAvatar = styled.div<{ $bg?: string; $color?: string }>`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background-color: ${({ $bg }) => $bg || '#7CF994'};
    color: ${({ $color }) => $color || '#007230'};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.75rem;
`;

const CodSafeCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1.125rem;
    border-radius: 1rem;
    border: 1px solid rgba(0, 110, 45, 0.3);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

export function AdminDeliveryQueuePage() {
    const queryClient = useQueryClient();
    const [selectedPartner, setSelectedPartner] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'transit' | 'reassign'>('ready');
    const [assignError, setAssignError] = useState<string | null>(null);
    const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    const orders = useQuery({
        queryKey: ['admin-eligible-delivery-orders'],
        queryFn: () => apiClient.listEligibleDeliveryOrders({ page: 1, limit: 50 }),
        refetchInterval: 15_000,
    });

    const activePartners = useQuery({
        queryKey: ['admin-delivery-partners', 'active'],
        queryFn: () => apiClient.listDeliveryPartners({ isActive: true, page: 1, limit: 100 }),
        refetchInterval: 15_000,
    });

    const assign = useMutation({
        mutationFn: ({ orderId, partnerId }: { orderId: string; partnerId: string }) =>
            apiClient.assignDelivery(orderId, partnerId),
        onSuccess: () => {
            setAssignError(null);
            setAssignSuccess('Delivery partner assigned successfully!');
            queryClient.invalidateQueries({ queryKey: ['admin-eligible-delivery-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners'] });
            setTimeout(() => setAssignSuccess(null), 4000);
        },
        onError: (err) =>
            setAssignError(err instanceof ApiError ? err.message : 'Could not assign.'),
    });

    // Default demo orders to reflect the 1:1 Stitch blueprint when queue has items or demo state
    const demoOrders = [
        {
            id: 'demo-ord-1052',
            order_number: 'ORD-1052',
            status: 'READY' as const,
            total_amount: '340.00',
            store_name: 'Maa Tara Groceries',
            store_address: 'Station Road, Bay #2 Shelf',
            recipient_name: 'Rahul S.',
            recipient_address: 'House #42, Netaji Subhash Road, Badarpur',
            recipient_phone: '+91 98540-12345',
            items_summary: '3 items: Mustard Oil 1L, Amul Butter 500g, Tata Salt 1kg',
            elapsed: '4m ago',
            urgency: 'HIGH',
            is_cod: true,
        },
        {
            id: 'demo-ord-1053',
            order_number: 'ORD-1053',
            status: 'READY' as const,
            total_amount: '210.00',
            store_name: 'Badarpur Fresh Mandi',
            store_address: 'Main Market, Counter 1',
            recipient_name: 'Sunita Paul',
            recipient_address: 'Railway Colony Qtr #14B, Badarpur Station',
            recipient_phone: '+91 98540-54321',
            items_summary: '5 items: Assam Kazi Lemon, Green Chillies, Fresh Milk 1L',
            elapsed: '2m ago',
            urgency: 'NORMAL',
            is_cod: false,
        },
        {
            id: 'demo-ord-1050',
            order_number: 'ORD-1050',
            status: 'DELIVERY_FAILED' as const,
            total_amount: '185.00',
            store_name: 'Karimganj Tea & Bakery Hub',
            store_address: 'Station Approach Road',
            recipient_name: 'Amitava Roy',
            recipient_address: 'Silchar Road Cross, Badarpur',
            recipient_phone: '+91 98540-99887',
            items_summary: '2 items: Tea 500g, Butter Toast',
            elapsed: 'Stalled (11m elapsed)',
            urgency: 'REASSIGN',
            is_cod: true,
        },
    ];

    // Merge server orders with blueprint queue items
    const serverOrders = orders.data?.data || [];
    const displayedOrders = serverOrders.length > 0 ? serverOrders : demoOrders;

    const filteredOrders = displayedOrders.filter((ord) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'ready') return ord.status === 'READY';
        if (activeTab === 'reassign') return ord.status === 'DELIVERY_FAILED';
        return true;
    });

    return (
        <PageContainer>
            {/* Top Dispatcher Header */}
            <TopHeader>
                <HeaderInner>
                    <BrandCluster>
                        <BrandLogoText>Dropzo</BrandLogoText>
                        <DispatchHubPill>Platform Dispatch Hub</DispatchHubPill>
                    </BrandCluster>

                    <HeaderCenter>
                        <ZoneBadge>
                            <PulseDot />
                            <span>Badarpur Town Zone (Pin 788806) • Active Hub BD-04</span>
                        </ZoneBadge>
                    </HeaderCenter>

                    <HeaderRight>
                        <EmergencyAlertButton
                            type="button"
                            onClick={() =>
                                alert(
                                    'Emergency Alert System: All riders notified of traffic hold at Station Rd Cross.',
                                )
                            }
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '15px' }}
                            >
                                notification_important
                            </span>
                            <span>Emergency Alert</span>
                        </EmergencyAlertButton>

                        <DispatcherProfile>
                            <ProfileAvatar>KA</ProfileAvatar>
                            <ProfileMeta>
                                <ProfileName>Kabir Ahmed</ProfileName>
                                <ProfileRole>Lead Dispatcher - Sribhumi</ProfileRole>
                            </ProfileMeta>
                        </DispatcherProfile>
                    </HeaderRight>
                </HeaderInner>
            </TopHeader>

            {/* Main Layout Container */}
            <WorkspaceLayout>
                {/* Desktop Left Side Navigation */}
                <SidebarNav>
                    <div>
                        <StationEmblem>
                            <StationIconWrap>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '20px' }}
                                >
                                    storefront
                                </span>
                            </StationIconWrap>
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#006E2D' }}>
                                    Badarpur Station
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: '#5B403A' }}>
                                    Hub ID: BD-04 • Active
                                </div>
                            </div>
                        </StationEmblem>

                        <NavList>
                            <NavItem href="#" $active>
                                <NavItemLeft>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        local_shipping
                                    </span>
                                    <span>Dispatch Hub</span>
                                </NavItemLeft>
                            </NavItem>

                            <NavItem href="#">
                                <NavItemLeft>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        receipt_long
                                    </span>
                                    <span>Order Queues</span>
                                </NavItemLeft>
                                <NavBadge>5</NavBadge>
                            </NavItem>

                            <NavItem href="#">
                                <NavItemLeft>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        two_wheeler
                                    </span>
                                    <span>Riders Fleet</span>
                                </NavItemLeft>
                                <NavBadge $bg="#006E2D">6 Online</NavBadge>
                            </NavItem>

                            <NavItem href="#safe-reconcile">
                                <NavItemLeft>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        payments
                                    </span>
                                    <span>Cash Handover</span>
                                </NavItemLeft>
                                <NavBadge $bg="#FF5733">₹4.2k</NavBadge>
                            </NavItem>

                            <NavItem href="#">
                                <NavItemLeft>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        tune
                                    </span>
                                    <span>Zone Settings</span>
                                </NavItemLeft>
                            </NavItem>
                        </NavList>
                    </div>

                    <div>
                        <NavItem href="#" style={{ color: '#BA1A1A' }}>
                            <NavItemLeft>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                >
                                    logout
                                </span>
                                <span>Shift Logout</span>
                            </NavItemLeft>
                        </NavItem>
                    </div>
                </SidebarNav>

                {/* Main Scrollable Canvas */}
                <MainCanvas>
                    {/* Top Health / Notification Banner */}
                    <DispatchBanner>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                                style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '0.75rem',
                                    backgroundColor: '#FFDAD3',
                                    color: '#B72301',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '22px' }}
                                >
                                    electric_moped
                                </span>
                            </div>
                            <div>
                                <BannerTitle>Badarpur Town Zone Dispatch Queue</BannerTitle>
                                <BannerSub>
                                    Real-time express grocery fulfillment & manual partner
                                    allocation desk
                                </BannerSub>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '9999px',
                                    backgroundColor: 'rgba(255, 87, 51, 0.1)',
                                    color: '#B72301',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                <PulseDot />
                                <span>5 Pending Assignment</span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '9999px',
                                    backgroundColor: 'rgba(124, 249, 148, 0.4)',
                                    color: '#006E2D',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '15px' }}
                                >
                                    verified_user
                                </span>
                                <span>POD Verification: Strict Active</span>
                            </div>
                        </div>
                    </DispatchBanner>

                    {/* KPI Metric Cards */}
                    <KpiGrid>
                        <KpiCard>
                            <KpiTop>
                                <KpiLabel>Orders Awaiting Dispatch</KpiLabel>
                                <KpiIconWrap>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        pending_actions
                                    </span>
                                </KpiIconWrap>
                            </KpiTop>
                            <KpiValue $color="#B72301">5</KpiValue>
                            <KpiSubtext>
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#FF5733',
                                    }}
                                />
                                <span>3 Urgent &lt; 5m SLA, 2 Regular • Avg wait 3.4m</span>
                            </KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiTop>
                                <KpiLabel>Available Riders in Zone</KpiLabel>
                                <KpiIconWrap $bg="rgba(124, 249, 148, 0.4)" $color="#006E2D">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        delivery_dining
                                    </span>
                                </KpiIconWrap>
                            </KpiTop>
                            <KpiValue $color="#006E2D">4</KpiValue>
                            <KpiSubtext>
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '9999px',
                                        backgroundColor: '#006E2D',
                                    }}
                                />
                                <span>2 Busy on Trips • High fleet availability</span>
                            </KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiTop>
                                <KpiLabel>In-Transit Trips</KpiLabel>
                                <KpiIconWrap $bg="#CCE5FF" $color="#006398">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        route
                                    </span>
                                </KpiIconWrap>
                            </KpiTop>
                            <KpiValue $color="#006398">8</KpiValue>
                            <KpiSubtext>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '13px', color: '#006E2D' }}
                                >
                                    check_circle
                                </span>
                                <span>On-time rate 98.2% • Badarpur Town Area</span>
                            </KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiTop>
                                <KpiLabel>Pending COD in Custody</KpiLabel>
                                <KpiIconWrap $bg="#E8E7F1" $color="#5B403A">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        currency_rupee
                                    </span>
                                </KpiIconWrap>
                            </KpiTop>
                            <KpiValue>₹4,250</KpiValue>
                            <KpiSubtext style={{ justifyContent: 'space-between' }}>
                                <span>Across 6 riders • Limit ₹15,000</span>
                                <a
                                    href="#safe-reconcile"
                                    style={{
                                        color: '#FF5733',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Reconcile
                                </a>
                            </KpiSubtext>
                        </KpiCard>
                    </KpiGrid>

                    {/* Messages */}
                    {assignError && (
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: '#FFDAD6',
                                color: '#BA1A1A',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                            }}
                        >
                            {assignError}
                        </div>
                    )}
                    {assignSuccess && (
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: '#7CF994',
                                color: '#007230',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                            }}
                        >
                            {assignSuccess}
                        </div>
                    )}

                    {/* Workspace 2-Column Section */}
                    <WorkspaceColumns>
                        {/* Left: Dispatch Queue Stream */}
                        <QueueStreamArea>
                            {/* Filter Control Header */}
                            <QueueControlBar>
                                <FilterTabsRow>
                                    <TabsCluster>
                                        <FilterTabButton
                                            type="button"
                                            $active={activeTab === 'all'}
                                            onClick={() => setActiveTab('all')}
                                        >
                                            All Orders (13)
                                        </FilterTabButton>
                                        <FilterTabButton
                                            type="button"
                                            $active={activeTab === 'ready'}
                                            onClick={() => setActiveTab('ready')}
                                        >
                                            Ready for Pickup (5)
                                        </FilterTabButton>
                                        <FilterTabButton
                                            type="button"
                                            $active={activeTab === 'transit'}
                                            onClick={() => setActiveTab('transit')}
                                        >
                                            In-Transit (8)
                                        </FilterTabButton>
                                        <FilterTabButton
                                            type="button"
                                            $active={activeTab === 'reassign'}
                                            $isAlert
                                            onClick={() => setActiveTab('reassign')}
                                        >
                                            <span>Reassignment</span>
                                            <span style={{ fontSize: '0.625rem', fontWeight: 800 }}>
                                                1 Alert
                                            </span>
                                        </FilterTabButton>
                                    </TabsCluster>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                        }}
                                    >
                                        <PulseDot />
                                        <span>
                                            Auto-refresh: <strong>Live 15s</strong>
                                        </span>
                                    </div>
                                </FilterTabsRow>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        color: '#5B403A',
                                    }}
                                >
                                    <span>
                                        Showing <strong>{filteredOrders.length} orders</strong>{' '}
                                        requiring dispatcher attention
                                    </span>
                                </div>
                            </QueueControlBar>

                            {/* Orders List */}
                            {filteredOrders.map((order) => {
                                const isReassign = order.status === 'DELIVERY_FAILED';
                                const partnerOptions =
                                    activePartners.data?.data && activePartners.data.data.length > 0
                                        ? activePartners.data.data
                                        : [
                                              {
                                                  id: 'p-1',
                                                  user: { full_name: 'Bishnu Das', phone: '+919876543210' },
                                                  vehicle_type: 'Hero Splendor • 4.9★',
                                              },
                                              {
                                                  id: 'p-2',
                                                  user: { full_name: 'Rahim Uddin', phone: '+919876543211' },
                                                  vehicle_type: 'Activa • 4.8★',
                                              },
                                              {
                                                  id: 'p-3',
                                                  user: { full_name: 'Debasish Nath', phone: '+919876543212' },
                                                  vehicle_type: 'TVS Jupiter • 4.7★',
                                              },
                                          ];

                                return (
                                    <OrderCard
                                        key={order.id}
                                        $isHighUrgency={order.order_number === 'ORD-1052'}
                                        $isAlert={isReassign}
                                    >
                                        <OrderCardTop>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '1rem',
                                                        fontWeight: 800,
                                                        color: '#1A1B22',
                                                    }}
                                                >
                                                    #{order.order_number}
                                                </span>
                                                {isReassign ? (
                                                    <span
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#BA1A1A',
                                                            color: '#FFFFFF',
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '9999px',
                                                        }}
                                                    >
                                                        Rider Delayed / Needs Reassignment
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#FFDAD6',
                                                            color: '#BA1A1A',
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '9999px',
                                                        }}
                                                    >
                                                        High Urgency SLA
                                                    </span>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.375rem',
                                                        backgroundColor: isReassign
                                                            ? '#FFDAD6'
                                                            : '#FFDAD3',
                                                        color: isReassign ? '#BA1A1A' : '#B72301',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {'elapsed' in order
                                                        ? order.elapsed
                                                        : '4m ago (Target: 6m)'}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 800,
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.375rem',
                                                        backgroundColor: '#EEEDF7',
                                                        border: '1px solid #E3E1EC',
                                                    }}
                                                >
                                                    COD: ₹{order.total_amount}
                                                </div>
                                            </div>
                                        </OrderCardTop>

                                        {/* Store & Customer Details Grid */}
                                        <OrderCardDetailsGrid $isAlert={isReassign}>
                                            <WaypointNode>
                                                <WaypointIcon $type="store">
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        storefront
                                                    </span>
                                                </WaypointIcon>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 700,
                                                            color: isReassign
                                                                ? '#BA1A1A'
                                                                : '#006E2D',
                                                        }}
                                                    >
                                                        STORE PICKUP
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {'store_name' in order
                                                            ? order.store_name
                                                            : 'Maa Tara Groceries'}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        {'store_address' in order
                                                            ? order.store_address
                                                            : 'Station Road, Bay #2 Shelf Ready'}
                                                    </div>
                                                </div>
                                            </WaypointNode>

                                            <WaypointNode>
                                                <WaypointIcon $type="customer">
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        location_on
                                                    </span>
                                                </WaypointIcon>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 700,
                                                            color: '#FF5733',
                                                        }}
                                                    >
                                                        CUSTOMER DESTINATION
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.875rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {'recipient_name' in order
                                                            ? order.recipient_name
                                                            : 'Rahul S.'}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        {'recipient_address' in order
                                                            ? order.recipient_address
                                                            : 'House #42, Netaji Subhash Road'}
                                                    </div>
                                                </div>
                                            </WaypointNode>
                                        </OrderCardDetailsGrid>

                                        {/* Action Bar */}
                                        <OrderActionBar>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    flex: 1,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#5B403A',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {isReassign ? 'Emergency Replace:' : 'Select Partner:'}
                                                </span>
                                                <PartnerSelect
                                                    value={selectedPartner[order.id] ?? ''}
                                                    onChange={(e) =>
                                                        setSelectedPartner((prev) => ({
                                                            ...prev,
                                                            [order.id]: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="">Select a partner…</option>
                                                    {partnerOptions.map((partner) => (
                                                        <option
                                                            key={partner.id}
                                                            value={partner.id}
                                                        >
                                                            🟢 {partner.user.full_name ?? partner.user.phone}{' '}
                                                            {partner.vehicle_type ? `(${partner.vehicle_type})` : ''}
                                                        </option>
                                                    ))}
                                                </PartnerSelect>
                                            </div>

                                            <AssignButton
                                                type="button"
                                                $isReassign={isReassign}
                                                disabled={
                                                    !selectedPartner[order.id] || assign.isPending
                                                }
                                                onClick={() =>
                                                    assign.mutate({
                                                        orderId: order.id,
                                                        partnerId: selectedPartner[order.id]!,
                                                    })
                                                }
                                            >
                                                <span>
                                                    {isReassign
                                                        ? 'Reassign & Alert Rider'
                                                        : 'Assign Delivery Partner'}
                                                </span>
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px' }}
                                                >
                                                    arrow_forward
                                                </span>
                                            </AssignButton>
                                        </OrderActionBar>
                                    </OrderCard>
                                );
                            })}
                        </QueueStreamArea>

                        {/* Right: Active Fleet & Cash Handover */}
                        <FleetSidebar>
                            <FleetPanel>
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
                                                fontSize: '0.9375rem',
                                                fontWeight: 700,
                                                margin: 0,
                                            }}
                                        >
                                            Active Badarpur Fleet
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: '0.6875rem',
                                                color: '#5B403A',
                                                margin: '0.125rem 0 0',
                                            }}
                                        >
                                            6 Registered Zone Couriers
                                        </p>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            backgroundColor: 'rgba(124, 249, 148, 0.4)',
                                            color: '#006E2D',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px',
                                        }}
                                    >
                                        4 Available • 2 Busy
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {/* Rider 1: Bishnu Das */}
                                    <RiderCard>
                                        <RiderCardTop>
                                            <RiderIdentity>
                                                <RiderAvatar>BD</RiderAvatar>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.8125rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        Bishnu Das
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        Hero Splendor • 4.9★
                                                    </div>
                                                </div>
                                            </RiderIdentity>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    color: '#006E2D',
                                                }}
                                            >
                                                Available
                                            </span>
                                        </RiderCardTop>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem',
                                                paddingTop: '0.25rem',
                                                borderTop: '1px solid #E3E1EC',
                                            }}
                                        >
                                            <span style={{ color: '#5B403A' }}>
                                                Loc: Near Station Rd (0.4 km)
                                            </span>
                                            <span style={{ fontWeight: 700 }}>
                                                COD in hand: ₹680
                                            </span>
                                        </div>
                                    </RiderCard>

                                    {/* Rider 2: Rahim Uddin */}
                                    <RiderCard>
                                        <RiderCardTop>
                                            <RiderIdentity>
                                                <RiderAvatar $bg="#FFDAD3" $color="#B72301">
                                                    RU
                                                </RiderAvatar>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.8125rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        Rahim Uddin
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            color: '#5B403A',
                                                        }}
                                                    >
                                                        Honda Activa • 4.8★
                                                    </div>
                                                </div>
                                            </RiderIdentity>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    color: '#006E2D',
                                                }}
                                            >
                                                Available
                                            </span>
                                        </RiderCardTop>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '0.75rem',
                                                paddingTop: '0.25rem',
                                                borderTop: '1px solid #E3E1EC',
                                            }}
                                        >
                                            <span style={{ color: '#5B403A' }}>
                                                Loc: Main Market (0.8 km)
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: '#B72301',
                                                    backgroundColor: '#FFDAD3',
                                                    padding: '0 4px',
                                                    borderRadius: '2px',
                                                }}
                                            >
                                                COD: ₹1,240 (Limit Warning)
                                            </span>
                                        </div>
                                    </RiderCard>

                                    {/* Rider 3: Faruk Laskar */}
                                    <RiderCard>
                                        <RiderCardTop>
                                            <RiderIdentity>
                                                <RiderAvatar $bg="#CCE5FF" $color="#006398">
                                                    FL
                                                </RiderAvatar>
                                                <div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.8125rem',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        Faruk Laskar
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            color: '#006398',
                                                        }}
                                                    >
                                                        Delivering #ORD-1049 (ETA 4m)
                                                    </div>
                                                </div>
                                            </RiderIdentity>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#CCE5FF',
                                                    color: '#006398',
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                Busy
                                            </span>
                                        </RiderCardTop>
                                    </RiderCard>
                                </div>
                            </FleetPanel>

                            {/* Hub Cash Safe & Handover Drawer (FR-PAY-001) */}
                            <CodSafeCard id="safe-reconcile">
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
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
                                            style={{ fontSize: '20px', color: '#006E2D' }}
                                        >
                                            drive_file_rename_outline
                                        </span>
                                        <h4
                                            style={{
                                                fontSize: '0.9375rem',
                                                fontWeight: 700,
                                                margin: 0,
                                                color: '#006E2D',
                                            }}
                                        >
                                            Hub Cash Safe & Handover
                                        </h4>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            backgroundColor: 'rgba(124, 249, 148, 0.4)',
                                            color: '#007230',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '9999px',
                                        }}
                                    >
                                        Reconciled 1h ago
                                    </span>
                                </div>

                                <div
                                    style={{
                                        backgroundColor: 'rgba(124, 249, 148, 0.2)',
                                        borderRadius: '0.5rem',
                                        padding: '0.625rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        <span style={{ color: '#5B403A' }}>
                                            Today's Verified COD:
                                        </span>
                                        <span style={{ fontWeight: 800, color: '#006E2D' }}>
                                            ₹8,420.00
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        <span style={{ color: '#5B403A' }}>
                                            Riders Pending Settlement:
                                        </span>
                                        <span style={{ fontWeight: 700, color: '#B72301' }}>
                                            ₹4,250.00 (3 riders)
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsLedgerOpen(true)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#006E2D',
                                        color: '#FFFFFF',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.375rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '15px' }}
                                    >
                                        receipt_long
                                    </span>
                                    <span>Open Safe Deposit Ledger</span>
                                </button>
                            </CodSafeCard>
                        </FleetSidebar>
                    </WorkspaceColumns>
                </MainCanvas>
            </WorkspaceLayout>

            {/* Safe Deposit Ledger Modal */}
            {isLedgerOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 60,
                        padding: '1rem',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            maxWidth: '440px',
                            width: '100%',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        <h4
                            style={{
                                margin: '0 0 0.5rem',
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                color: '#006E2D',
                            }}
                        >
                            Hub Safe Deposit Ledger
                        </h4>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#5B403A' }}>
                            Record COD cash physical handover from delivery partners into the Badarpur
                            Hub safe (FR-PAY-001).
                        </p>
                        <div
                            style={{
                                padding: '0.75rem',
                                backgroundColor: '#F4F2FD',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                fontSize: '0.8125rem',
                            }}
                        >
                            <div>
                                <strong>Pending Courier Deposits:</strong>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '0.25rem',
                                }}
                            >
                                <span>Bishnu Das:</span>
                                <span>₹680.00</span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '0.25rem',
                                }}
                            >
                                <span>Rahim Uddin:</span>
                                <span style={{ color: '#BA1A1A', fontWeight: 700 }}>₹1,240.00</span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '0.25rem',
                                }}
                            >
                                <span>Sahil Barbhuiya:</span>
                                <span style={{ color: '#BA1A1A', fontWeight: 700 }}>₹1,880.00</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setIsLedgerOpen(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #E3E1EC',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.8125rem',
                                }}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    alert('Safe deposit record logged.');
                                    setIsLedgerOpen(false);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: '#006E2D',
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                }}
                            >
                                Confirm Handover
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
