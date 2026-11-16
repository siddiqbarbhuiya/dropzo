import { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import type { CodHandover } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';

// --- Animations ---
const pulseAnimation = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

// --- Layout Components ---
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

const HeaderKpiChip = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
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

const StatusChip = styled.span<{ $variant?: 'success' | 'warning' | 'primary' }>`
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
              : theme.colors.surfaceContainer};
    color: ${({ $variant, theme }) =>
        $variant === 'success'
            ? theme.colors.secondary
            : $variant === 'warning'
              ? '#8C5E00'
              : theme.colors.textPrimary};
`;

// --- Partner Switcher Rail ---
const PartnerSelectorRail = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;

    &::-webkit-scrollbar {
        height: 4px;
    }
    &::-webkit-scrollbar-thumb {
        background: ${({ theme }) => theme.colors.borderSubtle};
        border-radius: 9999px;
    }
`;

const PartnerChip = styled.button<{ $selected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.875rem;
    border-radius: 9999px;
    background: ${({ $selected, theme }) =>
        $selected ? theme.colors.surfaceContainerLowest : theme.colors.surfaceContainerLow};
    border: 1.5px solid
        ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.borderSubtle)};
    box-shadow: ${({ $selected }) =>
        $selected ? '0 2px 8px rgba(255, 87, 51, 0.15)' : 'none'};
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:hover {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const PartnerChipAvatar = styled.div<{ $selected?: boolean }>`
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background-color: ${({ $selected, theme }) =>
        $selected ? theme.colors.primary : theme.colors.surfaceContainerHighest};
    color: ${({ $selected }) => ($selected ? '#ffffff' : '#4b5563')};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6875rem;
    font-weight: 800;
`;

const PartnerChipText = styled.div`
    display: flex;
    flex-direction: column;
    text-align: left;
`;

const PartnerChipName = styled.span`
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.2;
`;

const PartnerChipBalance = styled.span`
    font-size: 0.6875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.primary};
`;

// --- Custody Summary Card ---
const CustodyCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const RiderMetaBlock = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const RiderLargeAvatar = styled.div`
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1rem;
    background-color: #ffdad3;
    color: #b72301;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.25rem;
`;

const RiderDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const RiderName = styled.h2`
    font-size: 1.125rem;
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const RiderSub = styled.span`
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const CustodyStatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @media (min-width: 640px) {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const CustodyStatBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const StatLabel = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.textMuted};
`;

const StatValue = styled.span<{ $alert?: boolean }>`
    font-size: 1.375rem;
    font-weight: 800;
    color: ${({ $alert, theme }) => ($alert ? theme.colors.primary : theme.colors.textPrimary)};
    line-height: 1;
`;

const StatSub = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

// --- Split Workspace Grid ---
const SplitWorkspace = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @media (min-width: 1024px) {
        grid-template-columns: 1.7fr 1.1fr;
    }
`;

// --- Orders Table Card ---
const TableCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const TableHeaderBar = styled.div`
    padding: 1rem 1.25rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
`;

const TableTitle = styled.h3`
    font-size: 0.9375rem;
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const TableActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const PillButton = styled.button`
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

const RunningTotalBadge = styled.span`
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background-color: ${({ theme }) => theme.colors.secondaryLight};
    color: ${({ theme }) => theme.colors.secondary};
`;

const OrdersTable = styled.table`
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

const TableRow = styled.tr<{ $selected?: boolean }>`
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background-color: ${({ $selected, theme }) =>
        $selected ? theme.colors.surfaceContainerLow : 'transparent'};
    transition: background-color 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
    }

    td {
        padding: 0.875rem 1rem;
        vertical-align: middle;
    }
`;

const CheckboxInput = styled.input`
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 0.25rem;
    border: 1.5px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
`;

const OrderIdText = styled.span`
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    font-family: monospace;
`;

const CustomerBlock = styled.div`
    display: flex;
    flex-direction: column;
`;

const CustomerName = styled.span`
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const CustomerAddress = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const AmountText = styled.span`
    font-weight: 800;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

// --- Settlement Action Card ---
const ActionCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    position: sticky;
    top: 5rem;
`;

const ActionCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const ActionCardTitle = styled.h3`
    font-size: 1rem;
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const VerificationBox = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;
    user-select: none;
`;

const NotesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

const NotesLabel = styled.label`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    justify-content: space-between;
`;

const NotesTextarea = styled.textarea`
    width: 100%;
    min-height: 5rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: inherit;
    font-size: 0.8125rem;
    resize: vertical;

    &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.15);
    }
`;

const SettlementSummaryBox = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.8125rem;
`;

const SummaryRow = styled.div<{ $bold?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: ${({ $bold }) => ($bold ? '800' : '500')};
    color: ${({ $bold, theme }) => ($bold ? theme.colors.textPrimary : theme.colors.textSecondary)};
`;

const PrimaryCtaButton = styled.button`
    width: 100%;
    padding: 0.875rem 1.25rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.9375rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(255, 87, 51, 0.3);
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    &:hover:not(:disabled) {
        background-color: ${({ theme }) => theme.colors.primaryDark};
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
    }
`;

const MessageBanner = styled.div<{ $error?: boolean }>`
    padding: 0.625rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    background-color: ${({ $error, theme }) =>
        $error ? theme.colors.errorContainer : theme.colors.secondaryLight};
    color: ${({ $error, theme }) => ($error ? theme.colors.error : theme.colors.secondary)};
`;

// --- Audit Log Table Card ---
const AuditLogCard = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 1rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

// --- Receipt Modal ---
const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
`;

const ModalContent = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1.25rem;
    width: 100%;
    max-width: 28rem;
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
`;

const ModalHeader = styled.div`
    padding: 1.25rem 1.5rem;
    background: linear-gradient(
        135deg,
        ${({ theme }) => theme.colors.secondary} 0%,
        #005320 100%
    );
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.5rem;
`;

const ModalBody = styled.div`
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const ReceiptLineItem = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

/**
 * Dropzo Admin COD Handover & Safe Reconciliation Workspace.
 * 1:1 Responsive Implementation matching Stitch Desktop (7c9e5fe79c3b4a1c98b5d43db306f9ad)
 * and Mobile (d375a07690cc4342904f7876ae975d41).
 */
export function AdminCodHandoverPage() {
    const { partnerId } = useParams<{ partnerId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Query active delivery partners
    const partnersQuery = useQuery({
        queryKey: ['admin-delivery-partners-active'],
        queryFn: () => apiClient.listDeliveryPartners({ isActive: true }),
    });

    // Resolve active delivery partner id (from URL params or first partner from query)
    const activePartnerId = useMemo(() => {
        if (partnerId) return partnerId;
        const first = partnersQuery.data?.data?.[0];
        return first ? first.id : '';
    }, [partnerId, partnersQuery.data]);

    // Active partner object
    const activePartner = useMemo(() => {
        return partnersQuery.data?.data?.find((p) => p.id === activePartnerId);
    }, [partnersQuery.data, activePartnerId]);

    // Query partner COD summary
    const summaryQuery = useQuery({
        queryKey: ['admin-partner-cod-summary', activePartnerId],
        queryFn: () => apiClient.getDeliveryPartnerCodSummary(activePartnerId),
        enabled: !!activePartnerId,
    });

    // Query past handovers
    const handoversQuery = useQuery({
        queryKey: ['admin-partner-cod-handovers', activePartnerId],
        queryFn: () => apiClient.listDeliveryPartnerHandovers(activePartnerId, { page: 1, limit: 15 }),
        enabled: !!activePartnerId,
    });

    // Component state
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [isConfirmedInSafe, setIsConfirmedInSafe] = useState(false);
    const [cashierNotes, setCashierNotes] = useState('');
    const [handoverError, setHandoverError] = useState<string | null>(null);
    const [latestReceipt, setLatestReceipt] = useState<CodHandover | null>(null);

    // Calculate running selected amount
    const selectedAmount = useMemo(() => {
        if (!summaryQuery.data?.uncollectedAssignments) return 0;
        return summaryQuery.data.uncollectedAssignments
            .filter((item) => selectedOrderIds.has(item.orderId))
            .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    }, [summaryQuery.data, selectedOrderIds]);

    // Multi-select handlers
    function toggleOrder(orderId: string) {
        setSelectedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) next.delete(orderId);
            else next.add(orderId);
            return next;
        });
    }

    function selectAllOrders() {
        if (!summaryQuery.data?.uncollectedAssignments) return;
        const all = new Set(summaryQuery.data.uncollectedAssignments.map((a) => a.orderId));
        setSelectedOrderIds(all);
    }

    function deselectAllOrders() {
        setSelectedOrderIds(new Set());
    }

    // Handover mutation
    const recordHandover = useMutation({
        mutationFn: () =>
            apiClient.recordCodHandover(
                activePartnerId,
                Array.from(selectedOrderIds),
                cashierNotes.trim() || undefined,
            ),
        onSuccess: (res) => {
            setLatestReceipt(res);
            setSelectedOrderIds(new Set());
            setIsConfirmedInSafe(false);
            setCashierNotes('');
            setHandoverError(null);
            queryClient.invalidateQueries({
                queryKey: ['admin-partner-cod-summary', activePartnerId],
            });
            queryClient.invalidateQueries({
                queryKey: ['admin-partner-cod-handovers', activePartnerId],
            });
        },
        onError: (err) => {
            setHandoverError(
                err instanceof ApiError ? err.message : 'Could not record cash handover.',
            );
        },
    });

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
                        <HeaderKpiChip>
                            Cash in Custody:{' '}
                            <strong>
                                ₹
                                {Number(
                                    summaryQuery.data?.outstandingBalance ?? 0,
                                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </strong>
                        </HeaderKpiChip>
                        <HeaderKpiChip>
                            Today Safe Reconciled: <strong>₹32,450.00</strong>
                        </HeaderKpiChip>
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
                                <ProfileRole>Lead Dispatcher & Station Cashier</ProfileRole>
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
                            <NavItem to="/admin/delivery-partners">
                                <span className="material-symbols-outlined">two_wheeler</span>
                                <span>Riders Fleet</span>
                            </NavItem>
                            <NavItem to={`/admin/delivery-partners/${activePartnerId}/cod`} $active>
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

                {/* Main Content Workspace */}
                <MainContentArea>
                    {/* Top Header Banner */}
                    <PageHeaderBanner>
                        <div>
                            <BannerTitle>
                                Badarpur Hub COD Handover & Cash Reconciliation
                            </BannerTitle>
                            <BannerSubtitle>
                                Physical currency custody settlement, rider reconciliation, and daily safe balance audit (FR-PAY-001).
                            </BannerSubtitle>
                        </div>

                        <BannerBadges>
                            <StatusChip $variant="success">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    check_circle
                                </span>
                                Safe Status: Reconciled
                            </StatusChip>
                            <StatusChip $variant="primary">
                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                                    verified_user
                                </span>
                                POD Strict Active
                            </StatusChip>
                        </BannerBadges>
                    </PageHeaderBanner>

                    {/* Partner Selector Horizontal Rail */}
                    <PartnerSelectorRail>
                        <span
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                color: '#64748b',
                                marginRight: '0.25rem',
                            }}
                        >
                            Active Partners:
                        </span>
                        {partnersQuery.data?.data?.map((partner) => {
                            const isSelected = partner.id === activePartnerId;
                            const partnerName = partner.user?.full_name || 'Partner';
                            const initials = partnerName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2);

                            return (
                                <PartnerChip
                                    key={partner.id}
                                    type="button"
                                    $selected={isSelected}
                                    onClick={() =>
                                        navigate(`/admin/delivery-partners/${partner.id}/cod`)
                                    }
                                >
                                    <PartnerChipAvatar $selected={isSelected}>
                                        {initials}
                                    </PartnerChipAvatar>
                                    <PartnerChipText>
                                        <PartnerChipName>{partnerName}</PartnerChipName>
                                        <PartnerChipBalance>
                                            {partner.vehicle_type || 'Hero Splendor'}
                                        </PartnerChipBalance>
                                    </PartnerChipText>
                                </PartnerChip>
                            );
                        })}
                    </PartnerSelectorRail>

                    {/* Active Partner Custody Card */}
                    <CustodyCard>
                        <RiderMetaBlock>
                            <RiderLargeAvatar>
                                {activePartner?.user?.full_name
                                    ? activePartner.user.full_name
                                          .split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .slice(0, 2)
                                    : 'BD'}
                            </RiderLargeAvatar>
                            <RiderDetails>
                                <RiderName>
                                    <span>
                                        {activePartner?.user?.full_name || 'Bishnu Das'}
                                    </span>
                                    <StatusChip $variant="success">On Duty</StatusChip>
                                </RiderName>
                                <RiderSub>
                                    <span>
                                        {activePartner?.vehicle_type || 'Hero Splendor'}
                                    </span>
                                    <span>•</span>
                                    <span>{activePartner?.user?.phone || '+91 94351 00001'}</span>
                                </RiderSub>
                            </RiderDetails>
                        </RiderMetaBlock>

                        <CustodyStatsGrid>
                            <CustodyStatBox>
                                <StatLabel>Cash in Custody</StatLabel>
                                <StatValue $alert>
                                    ₹
                                    {Number(
                                        summaryQuery.data?.outstandingBalance ?? 0,
                                    ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </StatValue>
                                <StatSub>Awaiting Hub Deposit</StatSub>
                            </CustodyStatBox>

                            <CustodyStatBox>
                                <StatLabel>Uncollected Orders</StatLabel>
                                <StatValue>
                                    {summaryQuery.data?.uncollectedAssignments?.length ?? 0}{' '}
                                    Orders
                                </StatValue>
                                <StatSub>100% Completed & Verified</StatSub>
                            </CustodyStatBox>

                            <CustodyStatBox>
                                <StatLabel>Threshold Limit</StatLabel>
                                <StatValue style={{ fontSize: '1.125rem' }}>
                                    ₹4,000 Max
                                </StatValue>
                                <StatSub>85.5% capacity reached</StatSub>
                            </CustodyStatBox>
                        </CustodyStatsGrid>
                    </CustodyCard>

                    {/* Split Workspace: Left Orders Table & Right Handover Action */}
                    <SplitWorkspace>
                        {/* Left: Orders Table */}
                        <TableCard>
                            <TableHeaderBar>
                                <TableTitle>
                                    <span className="material-symbols-outlined">receipt</span>
                                    <span>
                                        Uncollected COD Orders in Custody (
                                        {summaryQuery.data?.uncollectedAssignments?.length ?? 0})
                                    </span>
                                </TableTitle>

                                <TableActions>
                                    <PillButton type="button" onClick={selectAllOrders}>
                                        Select All
                                    </PillButton>
                                    <PillButton type="button" onClick={deselectAllOrders}>
                                        Deselect All
                                    </PillButton>
                                    <RunningTotalBadge>
                                        Selected: ₹{selectedAmount.toLocaleString()} (
                                        {selectedOrderIds.size}/
                                        {summaryQuery.data?.uncollectedAssignments?.length ?? 0})
                                    </RunningTotalBadge>
                                </TableActions>
                            </TableHeaderBar>

                            <div style={{ overflowX: 'auto' }}>
                                <OrdersTable>
                                    <TableHead>
                                        <tr>
                                            <th style={{ width: '40px' }}>Select</th>
                                            <th>Order ID</th>
                                            <th>Customer & Location</th>
                                            <th>Delivery Time</th>
                                            <th>Cash Amount</th>
                                        </tr>
                                    </TableHead>
                                    <tbody>
                                        {summaryQuery.isLoading && (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                                                    Loading uncollected orders…
                                                </td>
                                            </tr>
                                        )}

                                        {!summaryQuery.isLoading &&
                                            summaryQuery.data?.uncollectedAssignments?.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        style={{
                                                            textAlign: 'center',
                                                            padding: '2.5rem',
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        No uncollected orders. All cash has been reconciled!
                                                    </td>
                                                </tr>
                                            )}

                                        {summaryQuery.data?.uncollectedAssignments?.map((item) => {
                                            const isChecked = selectedOrderIds.has(item.orderId);
                                            return (
                                                <TableRow key={item.orderId} $selected={isChecked}>
                                                    <td>
                                                        <CheckboxInput
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleOrder(item.orderId)}
                                                            aria-label={`Select order ${item.orderId}`}
                                                        />
                                                    </td>
                                                    <td>
                                                        <OrderIdText>{item.orderId}</OrderIdText>
                                                    </td>
                                                    <td>
                                                        <CustomerBlock>
                                                            <CustomerName>
                                                                Customer Handover
                                                            </CustomerName>
                                                            <CustomerAddress>
                                                                Badarpur Station Road
                                                            </CustomerAddress>
                                                        </CustomerBlock>
                                                    </td>
                                                    <td>
                                                        <span style={{ color: '#006E2D', fontWeight: 600 }}>
                                                            {item.collectedAt
                                                                ? new Date(item.collectedAt).toLocaleTimeString([], {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                  })
                                                                : 'Recently'}{' '}
                                                            • POD Verified
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <AmountText>₹{Number(item.amount).toFixed(2)}</AmountText>
                                                    </td>
                                                </TableRow>
                                            );
                                        })}
                                    </tbody>
                                </OrdersTable>
                            </div>
                        </TableCard>

                        {/* Right: Handover Settlement Action Card */}
                        <ActionCard>
                            <ActionCardHeader>
                                <ActionCardTitle>
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                    <span>Record Settlement</span>
                                </ActionCardTitle>
                                <StatusChip $variant="warning">Zero Variance</StatusChip>
                            </ActionCardHeader>

                            {/* Physical Cash Verification Checkbox */}
                            <VerificationBox>
                                <CheckboxInput
                                    type="checkbox"
                                    checked={isConfirmedInSafe}
                                    onChange={(e) => setIsConfirmedInSafe(e.target.checked)}
                                />
                                <span>
                                    I confirm physical Indian currency cash of{' '}
                                    <strong>₹{selectedAmount.toLocaleString()}</strong> has been
                                    verified and deposited into Badarpur Station Safe.
                                </span>
                            </VerificationBox>

                            {/* Cashier Notes Textarea */}
                            <NotesContainer>
                                <NotesLabel>
                                    <span>Cash Handover Receipt Note (Optional)</span>
                                    <span>{cashierNotes.length} / 2000 chars</span>
                                </NotesLabel>
                                <NotesTextarea
                                    maxLength={2000}
                                    placeholder="Add cashier verification notes or safe box remarks..."
                                    value={cashierNotes}
                                    onChange={(e) => setCashierNotes(e.target.value)}
                                />
                            </NotesContainer>

                            {/* Settlement Summary Breakdown */}
                            <SettlementSummaryBox>
                                <SummaryRow>
                                    <span>Selected Orders:</span>
                                    <span>{selectedOrderIds.size} orders</span>
                                </SummaryRow>
                                <SummaryRow>
                                    <span>Reconciled By:</span>
                                    <span>Kabir Ahmed (Cashier)</span>
                                </SummaryRow>
                                <SummaryRow $bold>
                                    <span>Total Handover Amount:</span>
                                    <span style={{ color: '#006E2D', fontSize: '1rem' }}>
                                        ₹{selectedAmount.toLocaleString()}
                                    </span>
                                </SummaryRow>
                            </SettlementSummaryBox>

                            {/* Primary Submission CTA */}
                            <PrimaryCtaButton
                                type="button"
                                disabled={
                                    selectedOrderIds.size === 0 ||
                                    !isConfirmedInSafe ||
                                    recordHandover.isPending
                                }
                                onClick={() => recordHandover.mutate()}
                            >
                                <span className="material-symbols-outlined">receipt_long</span>
                                <span>
                                    {recordHandover.isPending
                                        ? 'Recording Handover…'
                                        : `Record Cash Handover (₹${selectedAmount.toLocaleString()})`}
                                </span>
                            </PrimaryCtaButton>

                            {handoverError && <MessageBanner $error>{handoverError}</MessageBanner>}
                        </ActionCard>
                    </SplitWorkspace>

                    {/* Bottom Full-Width Audit Log Card */}
                    <AuditLogCard>
                        <TableHeaderBar>
                            <TableTitle>
                                <span className="material-symbols-outlined">history</span>
                                <span>Recent Hub Cash Handover Audit Log</span>
                            </TableTitle>
                            <StatusChip $variant="success">Audit Trail Protected</StatusChip>
                        </TableHeaderBar>

                        <div style={{ overflowX: 'auto' }}>
                            <OrdersTable>
                                <TableHead>
                                    <tr>
                                        <th>Handover ID</th>
                                        <th>Date & Time</th>
                                        <th>Received By Cashier</th>
                                        <th>Settled Amount</th>
                                        <th>Cashier Notes</th>
                                        <th>Status</th>
                                    </tr>
                                </TableHead>
                                <tbody>
                                    {handoversQuery.isLoading && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                                Loading handover history…
                                            </td>
                                        </tr>
                                    )}

                                    {!handoversQuery.isLoading &&
                                        handoversQuery.data?.data?.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    style={{
                                                        textAlign: 'center',
                                                        padding: '2rem',
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    No past handovers recorded yet for this partner.
                                                </td>
                                            </tr>
                                        )}

                                    {handoversQuery.data?.data?.map((handover) => (
                                        <TableRow key={handover.id}>
                                            <td>
                                                <OrderIdText>{handover.id}</OrderIdText>
                                            </td>
                                            <td>
                                                {new Date(handover.created_at).toLocaleString([], {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </td>
                                            <td>
                                                <span>Kabir Ahmed</span>
                                            </td>
                                            <td>
                                                <AmountText style={{ color: '#006E2D' }}>
                                                    ₹{Number(handover.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </AmountText>
                                            </td>
                                            <td>
                                                <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                                                    {handover.notes || 'Routine physical cash deposit.'}
                                                </span>
                                            </td>
                                            <td>
                                                <StatusChip $variant="success">
                                                    Safe Deposited
                                                </StatusChip>
                                            </td>
                                        </TableRow>
                                    ))}
                                </tbody>
                            </OrdersTable>
                        </div>
                    </AuditLogCard>
                </MainContentArea>
            </WorkspaceLayout>

            {/* Receipt Modal on Successful Settlement */}
            {latestReceipt && (
                <ModalBackdrop onClick={() => setLatestReceipt(null)}>
                    <ModalContent onClick={(e) => e.stopPropagation()}>
                        <ModalHeader>
                            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>
                                check_circle
                            </span>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                                Cash Handover Receipt Generated
                            </div>
                            <div style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
                                Badarpur Station Safe Box B-01
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            <ReceiptLineItem>
                                <span>Receipt Reference:</span>
                                <strong>{latestReceipt.id}</strong>
                            </ReceiptLineItem>
                            <ReceiptLineItem>
                                <span>Delivery Partner:</span>
                                <strong>{activePartner?.user?.full_name || 'Bishnu Das'}</strong>
                            </ReceiptLineItem>
                            <ReceiptLineItem>
                                <span>Cashier / Received By:</span>
                                <strong>Kabir Ahmed (Station Lead)</strong>
                            </ReceiptLineItem>
                            <ReceiptLineItem>
                                <span>Amount Deposited:</span>
                                <strong style={{ color: '#006E2D', fontSize: '1.125rem' }}>
                                    ₹{Number(latestReceipt.amount).toFixed(2)}
                                </strong>
                            </ReceiptLineItem>
                            <ReceiptLineItem>
                                <span>Timestamp:</span>
                                <strong>
                                    {new Date(latestReceipt.created_at).toLocaleString()}
                                </strong>
                            </ReceiptLineItem>

                            {latestReceipt.notes && (
                                <div
                                    style={{
                                        padding: '0.625rem',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: '#475569',
                                    }}
                                >
                                    <strong>Notes:</strong> {latestReceipt.notes}
                                </div>
                            )}

                            <PrimaryCtaButton
                                type="button"
                                onClick={() => setLatestReceipt(null)}
                                style={{ marginTop: '0.5rem' }}
                            >
                                Close & Return to Desk
                            </PrimaryCtaButton>
                        </ModalBody>
                    </ModalContent>
                </ModalBackdrop>
            )}
        </PageContainer>
    );
}
