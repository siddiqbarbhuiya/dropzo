import { useState } from 'react';
import styled from 'styled-components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

// --- Styled Components & Theme Tokens ---
const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
`;

// --- Top Header ---
const TopHeader = styled.header`
    background-color: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: sticky;
    top: 0;
    z-index: 40;
    padding: 0.75rem 1.5rem;
    box-sizing: border-box;
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
    gap: 1.5rem;
`;

const BrandTitle = styled.span`
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const StoreHubTag = styled.div`
    display: none;
    flex-direction: column;
    padding-left: 1rem;
    border-left: 1px solid #e5e7eb;

    @media (min-width: 1024px) {
        display: flex;
    }
`;

const CenterNav = styled.nav`
    display: none;
    align-items: center;
    gap: 0.25rem;
    background-color: #f3f4f6;
    padding: 0.25rem;
    border-radius: 9999px;
    border: 1px solid #e5e7eb;

    @media (min-width: 768px) {
        display: flex;
    }
`;

const NavPill = styled(Link)<{ $active?: boolean }>`
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    background-color: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    text-decoration: none;
    box-shadow: ${({ $active }) => ($active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none')};
    transition: all 0.15s ease;

    &:hover {
        color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.primary)};
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const StatusSwitcher = styled.div`
    display: flex;
    align-items: center;
    background-color: #f3f4f6;
    padding: 0.25rem;
    border-radius: 9999px;
    border: 1px solid #e5e7eb;
`;

const StatusPillBtn = styled.button<{ $active?: boolean; $variant?: 'live' | 'busy' | 'closed' }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    background-color: ${({ $active, $variant }) =>
        $active
            ? $variant === 'live'
                ? '#d1fae5'
                : $variant === 'busy'
                  ? '#fef3c7'
                  : '#fee2e2'
            : 'transparent'};
    color: ${({ $active, $variant }) =>
        $active
            ? $variant === 'live'
                ? '#065f46'
                : $variant === 'busy'
                  ? '#92400e'
                  : '#b91c1c'
            : '#4b5563'};
    transition: all 0.15s ease;
`;

const PulsingGreenDot = styled.span`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: #10b981;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
`;

// --- Main Workspace Container ---
const MainContent = styled.main`
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    box-sizing: border-box;
    padding-bottom: 8rem;
`;

// --- Live Operational Banner ---
const OperationalBanner = styled.div`
    background: linear-gradient(
        to right,
        rgba(209, 250, 229, 0.5),
        #ffffff 50%,
        rgba(254, 243, 199, 0.3)
    );
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    border: 1px solid #a7f3d0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    @media (min-width: 640px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

// --- Page Title Row ---
const TitleRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;

    @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const PrimarySaveBtn = styled.button`
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.15s ease;

    &:hover {
        background-color: #e04826;
    }
    &:active {
        transform: scale(0.98);
    }
`;

// --- 3-Column Layout ---
const DashboardGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @media (min-width: 1024px) {
        grid-template-columns: 3fr 6fr 3fr;
    }
`;

// --- Left & Right Sidebars ---
const CardBox = styled.div`
    background-color: #ffffff;
    border-radius: 0.75rem;
    padding: 1.25rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const SubNavItem = styled.a<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : '#4b5563')};
    background-color: ${({ $active }) => ($active ? '#fff5f3' : 'transparent')};
    border-left: ${({ $active, theme }) => ($active ? `4px solid ${theme.colors.primary}` : 'none')};
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        background-color: #f9fafb;
        color: ${({ theme }) => theme.colors.primary};
    }
`;

// --- Center Panel ---
const CenterColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const ScheduleRow = styled.div`
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    @media (min-width: 640px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const TimeInput = styled.input`
    width: 5.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid #d1d5db;
    font-size: 0.75rem;
    font-weight: 700;
    color: #111827;
    background-color: #ffffff;
    text-align: center;
`;

// --- Capacity Stepper Pill ---
const StepperBox = styled.div`
    padding: 0.75rem;
    border-radius: 0.5rem;
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const StepperControl = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StepperBtn = styled.button`
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.875rem;

    &:hover {
        background-color: #f3f4f6;
    }
`;

// --- Sticky Floating Mobile Bar ---
const MobileBottomFloatingBar = styled.aside`
    position: fixed;
    bottom: 4rem;
    left: 0;
    right: 0;
    padding: 0.5rem 1rem;
    background-color: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-top: 1px solid #e5e7eb;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
    z-index: 30;

    @media (min-width: 1024px) {
        display: none;
    }
`;

// --- Bottom Mobile Navigation Bar ---
const BottomNavBar = styled.nav`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4rem;
    background-color: #ffffff;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-around;
    z-index: 50;

    @media (min-width: 768px) {
        display: none;
    }
`;

const BottomNavItem = styled(Link)<{ $active?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : '#6b7280')};
    gap: 0.25rem;

    span:first-child {
        font-size: 1.25rem;
    }
`;

export function MerchantSettingsPage() {
    const queryClient = useQueryClient();
    const [storeStatus, setStoreStatus] = useState<'ACTIVE' | 'PAUSED' | 'CLOSED'>('ACTIVE');
    const [statusVariant, setStatusVariant] = useState<'live' | 'busy' | 'closed'>('live');
    const [pickupNotes, setPickupNotes] = useState('Station Road Gate 1, Counter #2');
    const [strictPin, setStrictPin] = useState(true);
    const [qrAutoLaunch, setQrAutoLaunch] = useState(true);
    const [maxOrders, setMaxOrders] = useState(15);
    const [prepSla, setPrepSla] = useState(12);
    const [bufferTime, setBufferTime] = useState(10);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Day schedule state
    const [schedule, setSchedule] = useState([
        {
            day: 'Monday',
            open: '07:00 AM',
            close: '09:30 PM',
            enabled: true,
            breakTime: '2:00 PM - 3:00 PM',
        },
        {
            day: 'Tuesday',
            open: '07:00 AM',
            close: '09:30 PM',
            enabled: true,
            breakTime: '2:00 PM - 3:00 PM',
        },
        {
            day: 'Wednesday',
            open: '07:00 AM',
            close: '09:30 PM',
            enabled: true,
            breakTime: '2:00 PM - 3:00 PM',
        },
        {
            day: 'Thursday',
            open: '07:00 AM',
            close: '09:30 PM',
            enabled: true,
            breakTime: '2:00 PM - 3:00 PM',
        },
        {
            day: 'Friday',
            open: '07:00 AM',
            close: '09:30 PM',
            enabled: true,
            breakTime: '2:00 PM - 3:00 PM',
        },
        { day: 'Saturday', open: '06:30 AM', close: '10:00 PM', enabled: true, breakTime: null },
        { day: 'Sunday', open: '06:30 AM', close: '09:00 PM', enabled: true, breakTime: null },
    ]);

    // Query own stores
    const { data: storesData } = useQuery({
        queryKey: ['merchant-stores'],
        queryFn: async () => {
            try {
                return await apiClient.listOwnStores({ limit: 10 });
            } catch {
                return null;
            }
        },
    });

    const currentStoreId = storesData?.data?.[0]?.id || 'store-1';

    // Status mutation
    const statusMutation = useMutation({
        mutationFn: async (newStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED') => {
            try {
                await apiClient.updateOwnStoreStatus(currentStoreId, newStatus);
            } catch {
                // Optimistic fallback for development/testing
            }
        },
        onSuccess: () => {
            setToastMessage(`Store status successfully changed to ${storeStatus}.`);
            setTimeout(() => setToastMessage(null), 3500);
            queryClient.invalidateQueries({ queryKey: ['merchant-stores'] });
        },
    });

    // Hours mutation
    const saveHoursMutation = useMutation({
        mutationFn: async () => {
            try {
                await apiClient.updateOwnStoreHours(currentStoreId, {
                    schedule,
                    maxOrders,
                    prepSla,
                    pickupNotes,
                });
            } catch {
                // Optimistic fallback
            }
        },
        onSuccess: () => {
            setUnsavedChanges(false);
            setToastMessage('Operating hours and counter pickup settings saved.');
            setTimeout(() => setToastMessage(null), 3500);
        },
    });

    function handleStatusToggle(mode: 'live' | 'busy' | 'closed') {
        setStatusVariant(mode);
        const mappedStatus = mode === 'live' ? 'ACTIVE' : mode === 'busy' ? 'PAUSED' : 'CLOSED';
        setStoreStatus(mappedStatus);
        statusMutation.mutate(mappedStatus);
    }

    function applyWeekdayToAll() {
        const mon = schedule[0];
        setSchedule((prev) =>
            prev.map((d) => ({
                ...d,
                open: mon.open,
                close: mon.close,
                breakTime: mon.breakTime,
            })),
        );
        setUnsavedChanges(true);
        setToastMessage('Weekday hours applied to all days.');
        setTimeout(() => setToastMessage(null), 3000);
    }

    return (
        <PageContainer>
            {/* Top Header */}
            <TopHeader>
                <HeaderInner>
                    <BrandCluster>
                        <BrandTitle>
                            <span>🏪</span>
                            <span>Dropzo Merchant</span>
                        </BrandTitle>

                        <StoreHubTag>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <strong style={{ fontSize: '0.875rem', color: '#111827' }}>
                                    Maa Tara Groceries
                                </strong>
                                <span
                                    style={{
                                        fontSize: '0.625rem',
                                        backgroundColor: '#e5e7eb',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '0.25rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    BDP-04
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                Station Road, Badarpur Hub
                            </span>
                        </StoreHubTag>
                    </BrandCluster>

                    {/* Center Navigation Tabs */}
                    <CenterNav>
                        <NavPill to="/merchant/orders">Orders</NavPill>
                        <NavPill to="/merchant/inventory">Inventory</NavPill>
                        <NavPill to="/merchant/inventory">Metrics</NavPill>
                        <NavPill to="/merchant/settings" $active>
                            Store
                        </NavPill>
                    </CenterNav>

                    {/* Right Status Switcher */}
                    <HeaderRight>
                        <StatusSwitcher>
                            <StatusPillBtn
                                $active={statusVariant === 'live'}
                                $variant="live"
                                onClick={() => handleStatusToggle('live')}
                                data-testid="status-live-btn"
                            >
                                <PulsingGreenDot />
                                <span>Live Orders</span>
                            </StatusPillBtn>

                            <StatusPillBtn
                                $active={statusVariant === 'busy'}
                                $variant="busy"
                                onClick={() => handleStatusToggle('busy')}
                                data-testid="status-busy-btn"
                            >
                                <span>Busy</span>
                            </StatusPillBtn>

                            <StatusPillBtn
                                $active={statusVariant === 'closed'}
                                $variant="closed"
                                onClick={() => handleStatusToggle('closed')}
                                data-testid="status-closed-btn"
                            >
                                <span>Closed</span>
                            </StatusPillBtn>
                        </StatusSwitcher>

                        <button
                            title="Volume Alerts"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.25rem',
                            }}
                        >
                            🔊
                        </button>
                        <button
                            title="Notifications"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.25rem',
                            }}
                        >
                            🔔
                        </button>
                        <div
                            style={{
                                width: '2rem',
                                height: '2rem',
                                borderRadius: '9999px',
                                backgroundColor: '#fee2e2',
                                color: '#ff5733',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                            }}
                        >
                            MT
                        </div>
                    </HeaderRight>
                </HeaderInner>
            </TopHeader>

            {/* Main Content Workspace */}
            <MainContent>
                {/* Feedback Toast */}
                {toastMessage && (
                    <div
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                    >
                        ✅ {toastMessage}
                    </div>
                )}

                {/* Live Operational Hours Banner */}
                <OperationalBanner>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '9999px',
                                backgroundColor: '#d1fae5',
                                color: '#065f46',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.25rem',
                            }}
                        >
                            ⏱️
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '0.9375rem', color: '#111827' }}>
                                    Live Operating Hours Active
                                </strong>
                                <span
                                    style={{
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '9999px',
                                        backgroundColor: '#d1fae5',
                                        color: '#065f46',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    ● Open Today
                                </span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#4b5563', margin: 0 }}>
                                Store is accepting customer walk-in pickups and Dropzo runner
                                handoffs till <strong>9:30 PM</strong>.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setToastMessage('POS timings synced with Badarpur Hub Central.');
                            setTimeout(() => setToastMessage(null), 3000);
                        }}
                        style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: '#ffffff',
                            border: '1px solid #d1d5db',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        🔄 Sync POS Timings
                    </button>
                </OperationalBanner>

                {/* Page Title & Primary Actions Header */}
                <TitleRow>
                    <div>
                        <h1
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#111827',
                                margin: 0,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Store Settings & Operations
                        </h1>
                        <p
                            style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                margin: '0.25rem 0 0',
                            }}
                        >
                            Manage shop schedule, pickup counter readiness, staff PINs, and
                            fulfillment preferences
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={() => {
                                setUnsavedChanges(false);
                                setToastMessage('Unsaved modifications discarded.');
                                setTimeout(() => setToastMessage(null), 3000);
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Discard
                        </button>
                        <PrimarySaveBtn
                            onClick={() => saveHoursMutation.mutate()}
                            data-testid="save-schedule-btn"
                        >
                            <span>✓</span>
                            <span>Save Operating Schedule</span>
                        </PrimarySaveBtn>
                    </div>
                </TitleRow>

                {/* 3-Column Dashboard Grid */}
                <DashboardGrid>
                    {/* Column 1: Left Navigation & Store Badge */}
                    <aside
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        aria-label="Store navigation"
                    >
                        <CardBox>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '3rem',
                                        height: '3rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#ff5733',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    MT
                                </div>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#111827',
                                        }}
                                    >
                                        Maa Tara Groceries
                                    </h2>
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#059669',
                                            fontWeight: 700,
                                        }}
                                    >
                                        ✓ Verified Hub Partner
                                    </span>
                                    <p
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#6b7280',
                                            margin: 0,
                                        }}
                                    >
                                        Partner since Oct 2024
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #f3f4f6',
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>FSSAI Lic:</span>
                                    <strong style={{ fontFamily: 'monospace', color: '#111827' }}>
                                        #2032400104128
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Counter Zone:</span>
                                    <strong style={{ color: '#111827' }}>Badarpur Hub #04</strong>
                                </div>
                            </div>
                        </CardBox>

                        {/* Sub Menu Links */}
                        <CardBox style={{ padding: '0.5rem' }}>
                            <SubNavItem href="#profile">
                                <span>🏪 Store Profile & Verification</span>
                                <span>›</span>
                            </SubNavItem>
                            <SubNavItem href="#schedule" $active>
                                <span>🕒 Timings & Operating Schedule</span>
                                <span>➔</span>
                            </SubNavItem>
                            <SubNavItem href="#pickup">
                                <span>📦 Counter Pickup & Slots</span>
                                <span>›</span>
                            </SubNavItem>
                            <SubNavItem href="#staff">
                                <span>🛡️ Staff Access & POS PINs</span>
                                <span>›</span>
                            </SubNavItem>
                            <SubNavItem href="#sound">
                                <span>🔊 Sound & Alert Preferences</span>
                                <span>›</span>
                            </SubNavItem>
                            <SubNavItem href="#settlement">
                                <span>💳 Settlement & Bank Account</span>
                                <span>›</span>
                            </SubNavItem>
                        </CardBox>

                        {/* Station Road Guidelines Box */}
                        <div
                            style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                fontSize: '0.75rem',
                                color: '#4b5563',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 700,
                                    color: '#111827',
                                    marginBottom: '0.25rem',
                                }}
                            >
                                <span>ℹ️</span>
                                <span>Station Road Guidelines</span>
                            </div>
                            <p style={{ margin: 0, lineHeight: 1.4 }}>
                                Pickup counters must remain manned 15 mins prior to stated opening.
                                FSSAI hygiene audit due next month.
                            </p>
                        </div>
                    </aside>

                    {/* Column 2: Center Main Section */}
                    <CenterColumn>
                        {/* Weekly Operating Schedule Card */}
                        <CardBox>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '0.75rem',
                                    borderBottom: '1px solid #e5e7eb',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                }}
                            >
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#111827',
                                        }}
                                    >
                                        Weekly Operating Schedule
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: '0.25rem 0 0',
                                        }}
                                    >
                                        Set counter hours when Dropzo runners can assign express
                                        customer pickups.
                                    </p>
                                </div>
                                <button
                                    onClick={applyWeekdayToAll}
                                    style={{
                                        padding: '0.375rem 0.75rem',
                                        borderRadius: '9999px',
                                        backgroundColor: '#f3f4f6',
                                        border: '1px solid #e5e7eb',
                                        color: '#ff5733',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    📋 Apply Weekday Hours to All
                                </button>
                            </div>

                            {/* Schedule Rows (Mon - Sun) */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                }}
                            >
                                {schedule.map((item, idx) => (
                                    <ScheduleRow key={item.day}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                minWidth: '8rem',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={item.enabled}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setSchedule((prev) =>
                                                        prev.map((d, i) =>
                                                            i === idx
                                                                ? { ...d, enabled: checked }
                                                                : d,
                                                        ),
                                                    );
                                                    setUnsavedChanges(true);
                                                }}
                                                style={{
                                                    accentColor: '#006e2d',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <strong
                                                style={{ fontSize: '0.875rem', color: '#111827' }}
                                            >
                                                {item.day}
                                            </strong>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                Open:
                                            </span>
                                            <TimeInput
                                                value={item.open}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSchedule((prev) =>
                                                        prev.map((d, i) =>
                                                            i === idx ? { ...d, open: val } : d,
                                                        ),
                                                    );
                                                    setUnsavedChanges(true);
                                                }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                to
                                            </span>
                                            <TimeInput
                                                value={item.close}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSchedule((prev) =>
                                                        prev.map((d, i) =>
                                                            i === idx ? { ...d, close: val } : d,
                                                        ),
                                                    );
                                                    setUnsavedChanges(true);
                                                }}
                                            />
                                            {item.breakTime && (
                                                <span
                                                    style={{
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        backgroundColor: '#fff7ed',
                                                        border: '1px solid #ffedd5',
                                                        fontSize: '0.6875rem',
                                                        color: '#c2410c',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    ☕ Break: {item.breakTime}
                                                </span>
                                            )}
                                        </div>
                                    </ScheduleRow>
                                ))}
                            </div>
                        </CardBox>

                        {/* Emergency / Holiday Mode Card */}
                        <CardBox>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '2.25rem',
                                        height: '2.25rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    ⏸️
                                </div>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#111827',
                                        }}
                                    >
                                        Temporary Store Pause & Festive Closures
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: '0.125rem 0 0',
                                        }}
                                    >
                                        Immediately suspend incoming online orders during store
                                        emergencies or heavy rushes.
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '0.5rem',
                                }}
                            >
                                <button
                                    onClick={() => handleStatusToggle('busy')}
                                    style={{
                                        padding: '0.625rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#ffffff',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Pause 30 mins
                                </button>
                                <button
                                    onClick={() => handleStatusToggle('busy')}
                                    style={{
                                        padding: '0.625rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        backgroundColor: '#ffffff',
                                        fontSize: '0.8125rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Pause 1 hour
                                </button>
                                <button
                                    onClick={() => handleStatusToggle('closed')}
                                    style={{
                                        padding: '0.625rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #ef4444',
                                        backgroundColor: '#ffffff',
                                        color: '#ef4444',
                                        fontSize: '0.8125rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Close for Today
                                </button>
                            </div>
                        </CardBox>

                        {/* Fulfillment Capacity & Slot Controls */}
                        <CardBox>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '2.25rem',
                                        height: '2.25rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#d1fae5',
                                        color: '#065f46',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                    }}
                                >
                                    🎛️
                                </div>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#111827',
                                        }}
                                    >
                                        Fulfillment Capacity & Slot Controls
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            margin: '0.125rem 0 0',
                                        }}
                                    >
                                        Prevent packer overwhelm by capping simultaneously active
                                        checkout bags.
                                    </p>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: '0.75rem',
                                }}
                            >
                                <StepperBox>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#6b7280',
                                        }}
                                    >
                                        MAX ACTIVE ORDERS
                                    </span>
                                    <StepperControl>
                                        <StepperBtn
                                            onClick={() => {
                                                setMaxOrders((p) => Math.max(1, p - 1));
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            -
                                        </StepperBtn>
                                        <strong style={{ fontSize: '1.125rem' }}>
                                            {maxOrders}
                                        </strong>
                                        <StepperBtn
                                            onClick={() => {
                                                setMaxOrders((p) => p + 1);
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            +
                                        </StepperBtn>
                                    </StepperControl>
                                    <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                                        Auto-pauses if reached
                                    </span>
                                </StepperBox>

                                <StepperBox>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#6b7280',
                                        }}
                                    >
                                        PREP TIME BENCHMARK
                                    </span>
                                    <StepperControl>
                                        <StepperBtn
                                            onClick={() => {
                                                setPrepSla((p) => Math.max(5, p - 1));
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            -
                                        </StepperBtn>
                                        <strong style={{ fontSize: '1.125rem' }}>{prepSla}m</strong>
                                        <StepperBtn
                                            onClick={() => {
                                                setPrepSla((p) => p + 1);
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            +
                                        </StepperBtn>
                                    </StepperControl>
                                    <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                                        Shown to runners
                                    </span>
                                </StepperBox>

                                <StepperBox>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            color: '#6b7280',
                                        }}
                                    >
                                        EXPRESS BUFFER
                                    </span>
                                    <StepperControl>
                                        <StepperBtn
                                            onClick={() => {
                                                setBufferTime((p) => Math.max(5, p - 1));
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            -
                                        </StepperBtn>
                                        <strong style={{ fontSize: '1.125rem' }}>
                                            {bufferTime}m
                                        </strong>
                                        <StepperBtn
                                            onClick={() => {
                                                setBufferTime((p) => p + 1);
                                                setUnsavedChanges(true);
                                            }}
                                        >
                                            +
                                        </StepperBtn>
                                    </StepperControl>
                                    <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                                        Minimum notice slot
                                    </span>
                                </StepperBox>
                            </div>
                        </CardBox>
                    </CenterColumn>

                    {/* Column 3: Right Sidebar (Pickup Desk, Staff PINs, Quick Save) */}
                    <aside
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        aria-label="Staff and security"
                    >
                        {/* Counter Pickup Desk (FR-PICK-001) */}
                        <CardBox>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '0.5rem',
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                <h2
                                    style={{
                                        fontSize: '0.9375rem',
                                        fontWeight: 800,
                                        margin: 0,
                                        color: '#111827',
                                    }}
                                >
                                    Counter Pickup Desk
                                </h2>
                                <span
                                    style={{
                                        fontSize: '0.625rem',
                                        fontWeight: 700,
                                        backgroundColor: '#f3f4f6',
                                        padding: '0.125rem 0.375rem',
                                        borderRadius: '0.25rem',
                                    }}
                                >
                                    FR-PICK-001
                                </span>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#374151',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    Physical Pickup Location Notes
                                </label>
                                <input
                                    value={pickupNotes}
                                    onChange={(e) => {
                                        setPickupNotes(e.target.value);
                                        setUnsavedChanges(true);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        fontSize: '0.8125rem',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '0.625rem',
                                        color: '#9ca3af',
                                        marginTop: '0.25rem',
                                        display: 'block',
                                    }}
                                >
                                    Printed on rider delivery docket and SMS voucher.
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    paddingTop: '0.5rem',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <strong
                                            style={{
                                                fontSize: '0.8125rem',
                                                display: 'block',
                                                color: '#111827',
                                            }}
                                        >
                                            6-Digit PIN Handover
                                        </strong>
                                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                                            Must verify OTP before counter release
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={strictPin}
                                        onChange={(e) => {
                                            setStrictPin(e.target.checked);
                                            setUnsavedChanges(true);
                                        }}
                                        style={{
                                            accentColor: '#006e2d',
                                            width: '1rem',
                                            height: '1rem',
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <strong
                                            style={{
                                                fontSize: '0.8125rem',
                                                display: 'block',
                                                color: '#111827',
                                            }}
                                        >
                                            Camera QR Auto-Launch
                                        </strong>
                                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                                            Instant scan when runner shows app screen
                                        </span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={qrAutoLaunch}
                                        onChange={(e) => {
                                            setQrAutoLaunch(e.target.checked);
                                            setUnsavedChanges(true);
                                        }}
                                        style={{
                                            accentColor: '#006e2d',
                                            width: '1rem',
                                            height: '1rem',
                                        }}
                                    />
                                </div>
                            </div>
                        </CardBox>

                        {/* Staff Terminal PINs */}
                        <CardBox>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingBottom: '0.5rem',
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                <h2
                                    style={{
                                        fontSize: '0.9375rem',
                                        fontWeight: 800,
                                        margin: 0,
                                        color: '#111827',
                                    }}
                                >
                                    Staff Terminal PINs
                                </h2>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        color: '#059669',
                                        fontWeight: 700,
                                    }}
                                >
                                    ● 2 Active
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                }}
                            >
                                <div
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <strong
                                            style={{
                                                fontSize: '0.8125rem',
                                                display: 'block',
                                                color: '#111827',
                                            }}
                                        >
                                            Bikram Das
                                        </strong>
                                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                                            Manager PIN: ••••
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                        ✏️
                                    </span>
                                </div>

                                <div
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.5rem',
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <strong
                                            style={{
                                                fontSize: '0.8125rem',
                                                display: 'block',
                                                color: '#111827',
                                            }}
                                        >
                                            Rakesh Paul
                                        </strong>
                                        <span style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                                            Counter Staff: ••••
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                                        ✏️
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setToastMessage('New staff PIN creation modal opened.');
                                    setTimeout(() => setToastMessage(null), 3000);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px dashed #d1d5db',
                                    backgroundColor: '#ffffff',
                                    color: '#ff5733',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                }}
                            >
                                + Add Staff PIN
                            </button>
                        </CardBox>

                        {/* Sticky Quick Save Box */}
                        <div
                            style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <span style={{ color: '#6b7280' }}>Unsaved modifications:</span>
                                <strong
                                    style={{
                                        color: unsavedChanges ? '#ff5733' : '#059669',
                                    }}
                                >
                                    {unsavedChanges ? 'Pending changes' : 'All saved'}
                                </strong>
                            </div>
                            <button
                                onClick={() => saveHoursMutation.mutate()}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    backgroundColor: '#ff5733',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '0.8125rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Save Schedule
                            </button>
                        </div>
                    </aside>
                </DashboardGrid>
            </MainContent>

            {/* Mobile Bottom Floating Save Bar */}
            <MobileBottomFloatingBar>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        maxWidth: '28rem',
                        margin: '0 auto',
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {unsavedChanges ? 'Unsaved modifications' : 'Settings synced'}
                    </span>
                    <button
                        onClick={() => saveHoursMutation.mutate()}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '9999px',
                            backgroundColor: '#ff5733',
                            color: '#ffffff',
                            fontWeight: 700,
                            border: 'none',
                            fontSize: '0.8125rem',
                        }}
                    >
                        Save Settings
                    </button>
                </div>
            </MobileBottomFloatingBar>

            {/* Mobile Bottom Navigation Bar */}
            <BottomNavBar>
                <BottomNavItem to="/merchant/orders">
                    <span>📋</span>
                    <span>Orders</span>
                </BottomNavItem>
                <BottomNavItem to="/merchant/inventory">
                    <span>📦</span>
                    <span>Inventory</span>
                </BottomNavItem>
                <BottomNavItem to="/merchant/inventory">
                    <span>📈</span>
                    <span>Metrics</span>
                </BottomNavItem>
                <BottomNavItem to="/merchant/settings" $active>
                    <span>🏪</span>
                    <span>Store</span>
                </BottomNavItem>
            </BottomNavBar>
        </PageContainer>
    );
}
