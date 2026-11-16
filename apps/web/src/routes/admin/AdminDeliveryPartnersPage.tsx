import { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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

const NavItem = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
    background-color: ${({ $active, theme }) =>
        $active ? theme.colors.surfaceContainerLow : 'transparent'};
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const MainContentArea = styled.main`
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 1440px;
    margin: 0 auto;
    width: 100%;
`;

// --- Banner & Header ---
const PageHeaderBanner = styled.div`
    background: linear-gradient(
        135deg,
        ${({ theme }) => theme.colors.surfaceContainerLow} 0%,
        ${({ theme }) => theme.colors.surfaceContainerLowest} 100%
    );
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const BannerTitle = styled.h1`
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0 0 0.25rem 0;
`;

const BannerSubtitle = styled.p`
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0;
`;

const BannerBadges = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const StatusChip = styled.span<{ $variant?: 'success' | 'warning' | 'primary' | 'muted' }>`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 700;
    background-color: ${({ $variant, theme }) =>
        $variant === 'success'
            ? theme.colors.secondaryLight
            : $variant === 'warning'
              ? theme.colors.warningContainer
              : $variant === 'primary'
                ? theme.colors.primaryLight
                : theme.colors.surfaceContainer};
    color: ${({ $variant, theme }) =>
        $variant === 'success'
            ? theme.colors.secondary
            : $variant === 'warning'
              ? '#8C5E00'
              : $variant === 'primary'
                ? theme.colors.primary
                : theme.colors.textSecondary};
`;

// --- KPI Row ---
const KpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @media (min-width: 1024px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const KpiCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    padding: 1.125rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
`;

const KpiLabel = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.textMuted};
`;

const KpiValue = styled.span<{ $highlight?: boolean }>`
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.1;
    color: ${({ $highlight, theme }) =>
        $highlight ? theme.colors.primary : theme.colors.textPrimary};
`;

const KpiSubtext = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

// --- Onboarding Card ---
const OnboardCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const CardTitle = styled.h3`
    font-size: 1rem;
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const FormRow = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
        grid-template-columns: 1.2fr 1.5fr auto;
        align-items: end;
    }
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

const FormLabel = styled.label`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const FormInput = styled.input`
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.8125rem;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.15);
    }
`;

const VehiclePillsRail = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const VehiclePill = styled.button<{ $selected?: boolean }>`
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${({ $selected, theme }) =>
        $selected ? theme.colors.primary : theme.colors.surfaceContainerLow};
    color: ${({ $selected }) => ($selected ? '#ffffff' : '#374151')};
    border: 1px solid
        ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.borderSubtle)};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const PrimaryButton = styled.button`
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.875rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 87, 51, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background-color: ${({ theme }) => theme.colors.primaryDark};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
    }
`;

const ErrorAlert = styled.div`
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background-color: ${({ theme }) => theme.colors.errorContainer};
    color: ${({ theme }) => theme.colors.error};
    font-size: 0.75rem;
    font-weight: 600;
`;

// --- Roster Table Card ---
const TableCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const TableFilterBar = styled.div`
    padding: 1rem 1.25rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
`;

const FilterTabs = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const FilterTab = styled.button<{ $active?: boolean }>`
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background-color: ${({ $active, theme }) =>
        $active ? theme.colors.primary : theme.colors.surfaceContainerLow};
    color: ${({ $active }) => ($active ? '#ffffff' : '#4b5563')};
    border: 1px solid
        ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderSubtle)};
    cursor: pointer;
    transition: all 0.15s ease;
`;

const CourierTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
`;

const TableHead = styled.thead`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};

    th {
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textSecondary};
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
`;

const TableRow = styled.tr`
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    transition: background-color 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
    }

    td {
        padding: 0.875rem 1rem;
        vertical-align: middle;
    }
`;

const RiderMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const RiderAvatar = styled.div<{ $online?: boolean }>`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background-color: #ffdad3;
    color: #b72301;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.75rem;
    position: relative;

    &::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 0.625rem;
        height: 0.625rem;
        border-radius: 9999px;
        background-color: ${({ $online, theme }) =>
            $online ? theme.colors.secondary : '#94a3b8'};
        border: 1.5px solid #ffffff;
    }
`;

const RiderText = styled.div`
    display: flex;
    flex-direction: column;
`;

const RiderName = styled.span`
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const RiderId = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-family: monospace;
`;

const StatusActionButton = styled.button<{ $danger?: boolean }>`
    padding: 0.3125rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid
        ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.secondary)};
    background-color: ${({ $danger, theme }) =>
        $danger ? theme.colors.errorContainer : theme.colors.secondaryLight};
    color: ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.secondary)};
    transition: all 0.15s ease;

    &:hover {
        opacity: 0.85;
    }
`;

const ReconcileLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    background-color: ${({ theme }) => theme.colors.primaryLight};
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        text-decoration: underline;
    }
`;

/**
 * Dropzo Platform Admin - Courier Fleet & Delivery Partner Management Console.
 * 1:1 Responsive Implementation matching Stitch Desktop (bcc5b48e78f2429ea5da5f62c4c8e058)
 * and Mobile (6166021b550a4560bba26a77eeedc642).
 */
export function AdminDeliveryPartnersPage() {
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState('');
    const [vehicleType, setVehicleType] = useState('Hero Splendor');
    const [createError, setCreateError] = useState<string | null>(null);
    const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    const vehiclePresets = ['Hero Splendor', 'Honda Activa', 'Electric Scooter', 'Bicycle'];

    // Query all delivery partners
    const partnersQuery = useQuery({
        queryKey: ['admin-delivery-partners'],
        queryFn: () => apiClient.listDeliveryPartners({ page: 1, limit: 100 }),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['admin-delivery-partners'] });
    }

    // Onboarding mutation
    const createPartner = useMutation({
        mutationFn: () =>
            apiClient.createDeliveryPartner(userId.trim(), vehicleType.trim() || undefined),
        onSuccess: () => {
            setUserId('');
            setCreateError(null);
            invalidate();
        },
        onError: (err) =>
            setCreateError(err instanceof ApiError ? err.message : 'Could not onboard partner.'),
    });

    // Activation & deactivation mutations
    const activatePartner = useMutation({
        mutationFn: (id: string) => apiClient.activateDeliveryPartner(id),
        onSuccess: invalidate,
    });

    const deactivatePartner = useMutation({
        mutationFn: (id: string) => apiClient.deactivateDeliveryPartner(id),
        onSuccess: invalidate,
    });

    // Filter partners based on active tab
    const filteredPartners = useMemo(() => {
        const list = partnersQuery.data?.data ?? [];
        if (filterTab === 'ACTIVE') return list.filter((p) => p.is_approved);
        if (filterTab === 'INACTIVE') return list.filter((p) => !p.is_approved);
        return list;
    }, [partnersQuery.data, filterTab]);

    // Compute stats
    const totalFleet = partnersQuery.data?.data?.length ?? 0;
    const onlineFleet = partnersQuery.data?.data?.filter((p) => p.is_available).length ?? 0;
    const activeFleet = partnersQuery.data?.data?.filter((p) => p.is_approved).length ?? 0;

    return (
        <PageContainer>
            {/* Top Admin Header */}
            <TopHeader>
                <HeaderInner>
                    <BrandCluster>
                        <BrandLogoText>dropzo</BrandLogoText>
                        <DispatchHubPill>Platform Admin - Hub BD-04</DispatchHubPill>
                    </BrandCluster>

                    <HeaderCenter>
                        <ZoneBadge>
                            <PulseDot />
                            <span>Badarpur Town Zone (Pin 788806) • Active Station BD-04</span>
                        </ZoneBadge>
                    </HeaderCenter>

                    <HeaderRight>
                        <EmergencyAlertButton type="button">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                warning
                            </span>
                            Emergency Alert
                        </EmergencyAlertButton>

                        <DispatcherProfile>
                            <ProfileAvatar>KA</ProfileAvatar>
                            <ProfileMeta>
                                <ProfileName>Kabir Ahmed</ProfileName>
                                <ProfileRole>Lead Dispatcher & Fleet Lead</ProfileRole>
                            </ProfileMeta>
                        </DispatcherProfile>
                    </HeaderRight>
                </HeaderInner>
            </TopHeader>

            <WorkspaceLayout>
                {/* Desktop Left Sidebar Navigation */}
                <SidebarNav>
                    <div>
                        <StationEmblem>
                            <StationIconWrap>
                                <span className="material-symbols-outlined">warehouse</span>
                            </StationIconWrap>
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>
                                    Badarpur Station Hub
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                    BD-04 • Active Desk
                                </div>
                            </div>
                        </StationEmblem>

                        <NavList>
                            <NavItem to="/admin/delivery-queue">
                                <span className="material-symbols-outlined">storefront</span>
                                <span>Dispatch Hub</span>
                            </NavItem>
                            <NavItem to="/admin/delivery-queue">
                                <span className="material-symbols-outlined">receipt_long</span>
                                <span>Order Queues</span>
                            </NavItem>
                            <NavItem to="/admin/delivery-partners" $active>
                                <span className="material-symbols-outlined">two_wheeler</span>
                                <span>Riders Fleet</span>
                            </NavItem>
                            <NavItem to="/admin/cod-handover">
                                <span className="material-symbols-outlined">payments</span>
                                <span>COD Handover & Safe</span>
                            </NavItem>
                            <NavItem to="/admin/merchant-approvals">
                                <span className="material-symbols-outlined">verified</span>
                                <span>Merchant Approvals</span>
                            </NavItem>
                        </NavList>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                        Dropzo Dispatch v2.4 • Badarpur, Assam
                    </div>
                </SidebarNav>

                {/* Main Content Area */}
                <MainContentArea>
                    {/* Top Header Banner */}
                    <PageHeaderBanner>
                        <div>
                            <BannerTitle>
                                Badarpur Fleet Roster & Delivery Partner Management
                            </BannerTitle>
                            <BannerSubtitle>
                                Real-time partner duty tracking, vehicle compliance, live cash custody, and fast courier onboarding (FR-DEL-001/002).
                            </BannerSubtitle>
                        </div>

                        <BannerBadges>
                            <StatusChip $variant="success">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    check_circle
                                </span>
                                {totalFleet} Registered Couriers
                            </StatusChip>
                            <StatusChip $variant="primary">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    sensors
                                </span>
                                {onlineFleet} Online on Duty
                            </StatusChip>
                        </BannerBadges>
                    </PageHeaderBanner>

                    {/* 4-Metric KPI Row */}
                    <KpiGrid>
                        <KpiCard>
                            <KpiLabel>Total Fleet Registered</KpiLabel>
                            <KpiValue>{totalFleet} Riders</KpiValue>
                            <KpiSubtext>{activeFleet} Active • Badarpur Zone</KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiLabel>Online on Duty</KpiLabel>
                            <KpiValue $highlight>{onlineFleet} Online</KpiValue>
                            <KpiSubtext>Available for Instant Dispatch</KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiLabel>Active Trips in Transit</KpiLabel>
                            <KpiValue>3 Orders</KpiValue>
                            <KpiSubtext>Avg SLA 11.2 min • 100% On-time</KpiSubtext>
                        </KpiCard>

                        <KpiCard>
                            <KpiLabel>Total Fleet COD in Custody</KpiLabel>
                            <KpiValue>₹4,250.00</KpiValue>
                            <KpiSubtext>
                                <Link
                                    to="/admin/cod-handover"
                                    style={{ color: '#FF5733', fontWeight: 700, textDecoration: 'none' }}
                                >
                                    Reconcile Safe Deposit →
                                </Link>
                            </KpiSubtext>
                        </KpiCard>
                    </KpiGrid>

                    {/* Fast Onboard New Delivery Partner Card */}
                    <OnboardCard>
                        <CardHeader>
                            <CardTitle>
                                <span className="material-symbols-outlined">person_add</span>
                                <span>Onboard a Delivery Partner</span>
                            </CardTitle>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Grants DELIVERY_PARTNER role to registered user account
                            </span>
                        </CardHeader>

                        <FormRow>
                            <FormGroup>
                                <FormLabel htmlFor="user-id-input">Existing User ID or Phone</FormLabel>
                                <FormInput
                                    id="user-id-input"
                                    placeholder="Enter User ID or Phone..."
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                />
                            </FormGroup>

                            <FormGroup>
                                <FormLabel>Vehicle Type Preset</FormLabel>
                                <VehiclePillsRail>
                                    {vehiclePresets.map((type) => (
                                        <VehiclePill
                                            key={type}
                                            type="button"
                                            $selected={vehicleType === type}
                                            onClick={() => setVehicleType(type)}
                                        >
                                            {type}
                                        </VehiclePill>
                                    ))}
                                </VehiclePillsRail>
                            </FormGroup>

                            <PrimaryButton
                                type="button"
                                disabled={!userId.trim() || createPartner.isPending}
                                onClick={() => createPartner.mutate()}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                    check
                                </span>
                                <span>
                                    {createPartner.isPending
                                        ? 'Onboarding…'
                                        : 'Onboard Courier Partner'}
                                </span>
                            </PrimaryButton>
                        </FormRow>

                        {createError && <ErrorAlert>{createError}</ErrorAlert>}
                    </OnboardCard>

                    {/* Courier Fleet Roster Table */}
                    <TableCard>
                        <TableFilterBar>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.9375rem' }}>
                                    Courier Fleet Roster ({filteredPartners.length})
                                </span>
                            </div>

                            <FilterTabs>
                                <FilterTab
                                    type="button"
                                    $active={filterTab === 'ALL'}
                                    onClick={() => setFilterTab('ALL')}
                                >
                                    All Fleet ({totalFleet})
                                </FilterTab>
                                <FilterTab
                                    type="button"
                                    $active={filterTab === 'ACTIVE'}
                                    onClick={() => setFilterTab('ACTIVE')}
                                >
                                    Active ({activeFleet})
                                </FilterTab>
                                <FilterTab
                                    type="button"
                                    $active={filterTab === 'INACTIVE'}
                                    onClick={() => setFilterTab('INACTIVE')}
                                >
                                    Inactive ({totalFleet - activeFleet})
                                </FilterTab>
                            </FilterTabs>
                        </TableFilterBar>

                        <div style={{ overflowX: 'auto' }}>
                            <CourierTable>
                                <TableHead>
                                    <tr>
                                        <th>Rider Details</th>
                                        <th>Contact Phone</th>
                                        <th>Vehicle Type</th>
                                        <th>Duty Status</th>
                                        <th>Cash in Custody</th>
                                        <th>Account Status</th>
                                        <th>Action</th>
                                    </tr>
                                </TableHead>
                                <tbody>
                                    {partnersQuery.isLoading && (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                                                Loading courier fleet…
                                            </td>
                                        </tr>
                                    )}

                                    {!partnersQuery.isLoading && filteredPartners.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '2.5rem',
                                                    color: '#64748b',
                                                }}
                                            >
                                                No delivery partners found for this filter.
                                            </td>
                                        </tr>
                                    )}

                                    {filteredPartners.map((partner) => {
                                        const initials = partner.user?.full_name
                                            ? partner.user.full_name
                                                  .split(' ')
                                                  .map((n) => n[0])
                                                  .join('')
                                                  .slice(0, 2)
                                            : 'DP';

                                        return (
                                            <TableRow key={partner.id}>
                                                <td>
                                                    <RiderMeta>
                                                        <RiderAvatar $online={partner.is_available}>
                                                            {initials}
                                                        </RiderAvatar>
                                                        <RiderText>
                                                            <RiderName>
                                                                {partner.user?.full_name || 'Partner'}
                                                            </RiderName>
                                                            <RiderId>{partner.id.slice(0, 8)}</RiderId>
                                                        </RiderText>
                                                    </RiderMeta>
                                                </td>

                                                <td>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {partner.user?.phone || '+91 94351-XXXXX'}
                                                    </span>
                                                </td>

                                                <td>
                                                    <StatusChip $variant="muted">
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '13px' }}
                                                        >
                                                            two_wheeler
                                                        </span>
                                                        {partner.vehicle_type || 'Motorcycle'}
                                                    </StatusChip>
                                                </td>

                                                <td>
                                                    {partner.is_available ? (
                                                        <StatusChip $variant="success">
                                                            <span
                                                                className="material-symbols-outlined"
                                                                style={{ fontSize: '13px' }}
                                                            >
                                                                sensors
                                                            </span>
                                                            Online
                                                        </StatusChip>
                                                    ) : (
                                                        <StatusChip $variant="muted">Offline</StatusChip>
                                                    )}
                                                </td>

                                                <td>
                                                    <ReconcileLink
                                                        to={`/admin/delivery-partners/${partner.id}/cod`}
                                                    >
                                                        <span>Reconcile COD</span>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            arrow_forward
                                                        </span>
                                                    </ReconcileLink>
                                                </td>

                                                <td>
                                                    {partner.is_approved ? (
                                                        <StatusChip $variant="success">Active</StatusChip>
                                                    ) : (
                                                        <StatusChip $variant="warning">
                                                            Inactive
                                                        </StatusChip>
                                                    )}
                                                </td>

                                                <td>
                                                    {partner.is_approved ? (
                                                        <StatusActionButton
                                                            type="button"
                                                            $danger
                                                            aria-label={`Deactivate ${partner.id}`}
                                                            disabled={deactivatePartner.isPending}
                                                            onClick={() =>
                                                                deactivatePartner.mutate(partner.id)
                                                            }
                                                        >
                                                            Deactivate
                                                        </StatusActionButton>
                                                    ) : (
                                                        <StatusActionButton
                                                            type="button"
                                                            aria-label={`Activate ${partner.id}`}
                                                            disabled={activatePartner.isPending}
                                                            onClick={() =>
                                                                activatePartner.mutate(partner.id)
                                                            }
                                                        >
                                                            Activate
                                                        </StatusActionButton>
                                                    )}
                                                </td>
                                            </TableRow>
                                        );
                                    })}
                                </tbody>
                            </CourierTable>
                        </div>
                    </TableCard>
                </MainContentArea>
            </WorkspaceLayout>
        </PageContainer>
    );
}
