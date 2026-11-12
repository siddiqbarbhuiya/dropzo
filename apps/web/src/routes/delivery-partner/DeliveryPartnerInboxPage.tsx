import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';

// --- Animations ---
const pulseRing = keyframes`
  0% { transform: scale(0.9); opacity: 0.9; }
  50% { transform: scale(1.6); opacity: 0; }
  100% { transform: scale(0.9); opacity: 0; }
`;

const ping = keyframes`
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
`;

// --- Styled Components & Theme Tokens ---
const PageViewport = styled.div`
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    justify-content: center;
    box-sizing: border-box;
`;

const MobileContainer = styled.main`
    width: 100%;
    max-width: 480px;
    background-color: ${({ theme }) => theme.colors.background};
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    padding-bottom: 7.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    box-sizing: border-box;
`;

// --- Header ---
const StickyHeader = styled.header`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    position: sticky;
    top: 0;
    z-index: 40;
    padding: 0.75rem 1rem 0.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const HeaderTopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
`;

const BrandCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const BrandLogoText = styled.span`
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.02em;
`;

const PartnerBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    background-color: #7cf994;
    color: #007230;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 1px solid rgba(0, 110, 45, 0.2);
`;

const HeaderRightCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const SosButton = styled.button`
    height: 2rem;
    padding: 0 0.625rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.errorContainer};
    color: ${({ theme }) => theme.colors.error};
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &:active {
        transform: scale(0.95);
    }
`;

const RiderProfileChip = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding-left: 0.375rem;
    border-left: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const AvatarWrap = styled.div`
    position: relative;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.primary};
`;

const OnlineStatusDot = styled.span<{ $online?: boolean }>`
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 9999px;
    background-color: ${({ $online }) => ($online ? '#006E2D' : '#8F7069')};
    border: 2px solid #ffffff;
`;

const RiderMeta = styled.div`
    display: flex;
    flex-direction: column;
    text-align: left;
`;

const RiderName = styled.span`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    line-height: 1;
`;

const RiderRating = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.125rem;
    margin-top: 0.125rem;
`;

const HeaderBottomRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.375rem;
    border-top: 1px solid rgba(227, 225, 236, 0.4);
`;

const ZonePill = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
`;

const RadarDot = styled.div`
    position: relative;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.secondary};

    &::before {
        content: '';
        position: absolute;
        left: -2px;
        top: -2px;
        width: 12px;
        height: 12px;
        border-radius: 9999px;
        background-color: #006e2d;
        animation: ${pulseRing} 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
`;

const ZoneText = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const AvailabilityToggle = styled.button<{ $online?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background-color: ${({ $online }) =>
        $online ? 'rgba(124, 249, 148, 0.4)' : 'rgba(227, 225, 236, 0.6)'};
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    border: 1px solid ${({ $online }) => ($online ? 'rgba(0, 110, 45, 0.3)' : '#8F7069')};
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const AvailabilityLabel = styled.span<{ $online?: boolean }>`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ $online }) => ($online ? '#007230' : '#5B403A')};
`;

const AvailabilityIconDot = styled.div<{ $online?: boolean }>`
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    background-color: ${({ $online }) => ($online ? '#006E2D' : '#8F7069')};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
`;

// --- Content Area ---
const ContentCanvas = styled.div`
    flex: 1;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

// --- Shift Metrics Strip ---
const MetricsCard = styled.section`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    padding: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    text-align: center;

    & > div:not(:last-child) {
        border-right: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    }
`;

const MetricCol = styled.div`
    padding: 0 0.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const MetricLabel = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
`;

const MetricValue = styled.span<{ $color?: string }>`
    font-size: 1.125rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
    margin-top: 0.125rem;
`;

const MetricSub = styled.span`
    font-size: 0.625rem;
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 600;
`;

// --- Active Task Hero Card ---
const TaskCard = styled.section`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
`;

const TaskBanner = styled.div`
    background-color: rgba(255, 87, 51, 0.05);
    padding: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderOutlineVariant};
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const TaskStatusChip = styled.span`
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.6875rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
`;

const OrderIdText = styled.span`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const PayoutAmount = styled.div`
    font-size: 1.125rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.secondary};
    text-align: right;
`;

const PayoutSub = styled.span`
    font-size: 0.625rem;
    color: ${({ theme }) => theme.colors.textMuted};
    display: block;
`;

const WaypointsList = styled.div`
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const WaypointRow = styled.div`
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
`;

const WaypointConnector = styled.div`
    position: absolute;
    left: 0.875rem;
    top: 1.75rem;
    bottom: -1rem;
    width: 2px;
    background-color: #7cf994;
`;

const WaypointIconNode = styled.div<{ $type?: 'pickup' | 'drop' }>`
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background-color: ${({ $type, theme }) =>
        $type === 'pickup' ? theme.colors.secondary : theme.colors.primary};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    z-index: 10;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;

const WaypointBox = styled.div<{ $highlight?: boolean }>`
    flex: 1;
    background-color: ${({ $highlight, theme }) =>
        $highlight ? theme.colors.surfaceContainerLowest : theme.colors.surfaceContainerLow};
    padding: 0.625rem;
    border-radius: 0.5rem;
    border: ${({ $highlight, theme }) =>
        $highlight
            ? `2px solid rgba(255, 87, 51, 0.3)`
            : `1px solid ${theme.colors.borderSubtle}`};
`;

const WaypointHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const WaypointTag = styled.span<{ $color?: string }>`
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ $color, theme }) => $color || theme.colors.secondary};
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const PulsingDot = styled.span`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    animation: ${ping} 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
`;

const ShelfBadge = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    background-color: ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const WaypointName = styled.h3`
    font-size: 1rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0.25rem 0 0;
`;

const WaypointAddress = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    margin: 0.125rem 0 0;
`;

const ManifestStrip = styled.div`
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(227, 225, 236, 0.8);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
`;

const ActionIconButton = styled.a`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background-color: #7cf994;
    color: #007230;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: all 0.15s ease;

    &:active {
        transform: scale(0.95);
    }
`;

const InstructionBox = styled.div`
    margin-top: 0.625rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.5rem;
    border-radius: 0.375rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.75rem;
`;

const NavMapsButton = styled.button`
    margin-top: 0.625rem;
    width: 100%;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    transition: background-color 0.15s;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainerHighest};
    }
`;

// --- Checklist Section ---
const ChecklistCard = styled.section`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    padding: 0.875rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const ChecklistHeader = styled.h4`
    font-size: 0.9375rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0 0 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ChecklistStepRow = styled.div<{ $done?: boolean; $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.8125rem;
    padding: ${({ $active }) => ($active ? '0.5rem' : '0.25rem 0')};
    border-radius: ${({ $active }) => ($active ? '0.5rem' : '0')};
    background-color: ${({ $active }) => ($active ? 'rgba(255, 87, 51, 0.05)' : 'transparent')};
    border: ${({ $active }) => ($active ? '1px solid rgba(255, 87, 51, 0.2)' : 'none')};
    color: ${({ $done, $active, theme }) =>
        $done ? theme.colors.textMuted : $active ? theme.colors.primary : theme.colors.textPrimary};
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const PinCluster = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
    margin: 0.5rem 0;
`;

const PinInput = styled.input`
    height: 2.75rem;
    text-align: center;
    font-size: 1.125rem;
    font-weight: 700;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    border-radius: 0.5rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    outline: none;
    font-family: inherit;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primary};
    }
`;

const CodCollectCard = styled.div`
    padding: 0.625rem;
    border-radius: 0.5rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.75rem;
`;

const CodIconWrap = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: #7cf994;
    color: #007230;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const UpiQrButton = styled.button`
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background-color: #ffffff;
    border: 1px solid rgba(143, 112, 105, 0.3);
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

    &:active {
        transform: scale(0.95);
    }
`;

const DispatchHelpCard = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border-radius: 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.8125rem;
`;

// --- Sticky Floating Action CTA Bar ---
const FloatingCtaBar = styled.div`
    position: fixed;
    bottom: 3.5rem;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    padding: 1rem 0.875rem 0.5rem;
    z-index: 40;
    background: linear-gradient(
        to top,
        ${({ theme }) => theme.colors.background} 75%,
        rgba(251, 248, 255, 0)
    );
    box-sizing: border-box;
`;

const PrimaryCtaButton = styled.button`
    width: 100%;
    padding: 0.875rem 1rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.9375rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 14px rgba(255, 87, 51, 0.3);
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background-color: #b72301;
    }

    &:active:not(:disabled) {
        transform: scale(0.98);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

// --- Bottom Navigation Bar ---
const BottomNav = styled.nav`
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    z-index: 50;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.375rem 0.5rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-top: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
    box-sizing: border-box;
`;

const NavTab = styled.a<{ $active?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border-radius: 9999px;
    padding: 0.25rem 0.75rem;
    background-color: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#5B403A')};
    transition: all 0.2s ease;

    &:active {
        transform: scale(0.95);
    }
`;

const NavTabLabel = styled.span<{ $active?: boolean }>`
    font-size: 0.6875rem;
    font-weight: 600;
    color: ${({ $active }) => ($active ? '#ffffff' : 'inherit')};
`;

// --- Rejection / Failure Form Drawer ---
const ActionDrawer = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    border-radius: 0.75rem;
    padding: 0.875rem;
    margin-top: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const ReasonInput = styled.input`
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.8125rem;
    outline: none;
    box-sizing: border-box;
    margin-bottom: 0.5rem;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
    }
`;

const ActionButtonGroup = styled.div`
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
`;

const SecondaryButton = styled.button`
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    background-color: transparent;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
`;

const DangerActionButton = styled.button`
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    background-color: ${({ theme }) => theme.colors.error};
    border: none;
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export function DeliveryPartnerInboxPage() {
    const queryClient = useQueryClient();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [failReason, setFailReason] = useState('');
    const [showFailForm, setShowFailForm] = useState(false);
    const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const profile = useQuery({
        queryKey: ['delivery-partner-profile'],
        queryFn: () => apiClient.getOwnDeliveryProfile(),
    });

    const assignment = useQuery({
        queryKey: ['delivery-partner-current-assignment'],
        queryFn: () => apiClient.getOwnCurrentAssignment(),
        refetchInterval: 15_000,
    });

    const codSummary = useQuery({
        queryKey: ['delivery-partner-cod-summary'],
        queryFn: () => apiClient.getOwnCodSummary(),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['delivery-partner-current-assignment'] });
        queryClient.invalidateQueries({ queryKey: ['delivery-partner-cod-summary'] });
    }

    const orderId = assignment.data?.order_id;
    const deliveryStatus = assignment.data?.delivery_status;

    const setAvailability = useMutation({
        mutationFn: (isAvailable: boolean) => apiClient.setOwnAvailability(isAvailable),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-partner-profile'] }),
    });

    const accept = useMutation({
        mutationFn: () => apiClient.acceptAssignment(orderId!),
        onSuccess: invalidate,
    });

    const reject = useMutation({
        mutationFn: (reason: string) => apiClient.rejectAssignment(orderId!, reason),
        onSuccess: () => {
            setShowRejectForm(false);
            setRejectReason('');
            invalidate();
        },
    });

    const collect = useMutation({
        mutationFn: () => apiClient.collectAssignment(orderId!),
        onSuccess: invalidate,
    });

    const outForDelivery = useMutation({
        mutationFn: () => apiClient.markOutForDelivery(orderId!),
        onSuccess: invalidate,
    });

    const verifyDelivery = useMutation({
        mutationFn: (code: string) => apiClient.verifyDeliveryCode(orderId!, code),
        onSuccess: (result) => {
            if (result.verified) {
                setVerifyMessage('Delivery verified — order completed successfully.');
                invalidate();
            } else {
                setVerifyMessage(
                    `Incorrect PIN. ${result.attemptsRemaining} attempt(s) remaining.`,
                );
            }
        },
        onError: (err) =>
            setVerifyMessage(err instanceof ApiError ? err.message : 'Verification failed.'),
    });

    const reportFailure = useMutation({
        mutationFn: (reason: string) => apiClient.reportDeliveryFailure(orderId!, reason),
        onSuccess: () => {
            setShowFailForm(false);
            setFailReason('');
            invalidate();
        },
    });

    const isOnline = profile.data?.is_available ?? false;
    const isApproved = profile.data?.is_approved ?? false;

    // Handle 6-digit PIN input
    const handlePinChange = (index: number, val: string) => {
        const char = val.slice(-1);
        const updated = [...pinDigits];
        updated[index] = char;
        setPinDigits(updated);

        // Auto advance to next input box
        if (char && index < 5) {
            const nextInput = document.getElementById(`pin-input-${index + 1}`);
            nextInput?.focus();
        }
    };

    const deliveryCodeString = pinDigits.join('');

    return (
        <PageViewport>
            <MobileContainer>
                {/* Top Header */}
                <StickyHeader>
                    <HeaderTopRow>
                        <BrandCluster>
                            <BrandLogoText>Dropzo</BrandLogoText>
                            <PartnerBadge>PARTNER</PartnerBadge>
                        </BrandCluster>

                        <HeaderRightCluster>
                            <SosButton
                                type="button"
                                aria-label="Emergency SOS"
                                onClick={() =>
                                    alert('Emergency SOS triggered. Notifying Badarpur Police & Hub Dispatch.')
                                }
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '15px' }}
                                >
                                    sos
                                </span>
                                <span>SOS</span>
                            </SosButton>

                            <RiderProfileChip>
                                <AvatarWrap>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '20px' }}
                                    >
                                        person
                                    </span>
                                    <OnlineStatusDot $online={isOnline} />
                                </AvatarWrap>
                                <RiderMeta>
                                    <RiderName>
                                        {profile.data?.user?.full_name || 'Bishnu D.'}
                                    </RiderName>
                                    <RiderRating>★ 4.9</RiderRating>
                                </RiderMeta>
                            </RiderProfileChip>
                        </HeaderRightCluster>
                    </HeaderTopRow>

                    <HeaderBottomRow>
                        <ZonePill>
                            <RadarDot />
                            <ZoneText>Badarpur Town Zone</ZoneText>
                        </ZonePill>

                        <AvailabilityToggle
                            type="button"
                            $online={isOnline}
                            disabled={!isApproved || setAvailability.isPending}
                            onClick={() => setAvailability.mutate(!isOnline)}
                        >
                            <AvailabilityLabel $online={isOnline}>
                                {isOnline ? 'Go offline' : 'Go online'}
                            </AvailabilityLabel>
                            <AvailabilityIconDot $online={isOnline}>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '12px' }}
                                >
                                    {isOnline ? 'check' : 'close'}
                                </span>
                            </AvailabilityIconDot>
                        </AvailabilityToggle>
                    </HeaderBottomRow>
                </StickyHeader>

                {/* Content Canvas */}
                <ContentCanvas>
                    {/* Shift Metrics Strip */}
                    <MetricsCard>
                        <MetricsGrid>
                            <MetricCol>
                                <MetricLabel>Today's Earnings</MetricLabel>
                                <MetricValue $color="#FF5733">₹480</MetricValue>
                                <MetricSub>8 Trips (Avg ₹60)</MetricSub>
                            </MetricCol>
                            <MetricCol>
                                <MetricLabel>Cash in Hand</MetricLabel>
                                <MetricValue>
                                    ₹{codSummary.data?.outstandingBalance ?? '340'}
                                </MetricValue>
                                <MetricSub style={{ color: '#8F7069' }}>To Deposit</MetricSub>
                            </MetricCol>
                            <MetricCol>
                                <MetricLabel>Acceptance</MetricLabel>
                                <MetricValue $color="#006E2D">98%</MetricValue>
                                <MetricSub
                                    style={{
                                        backgroundColor: '#006E2D',
                                        color: '#7CF994',
                                        padding: '0 4px',
                                        borderRadius: '2px',
                                    }}
                                >
                                    On-Time 100%
                                </MetricSub>
                            </MetricCol>
                        </MetricsGrid>
                    </MetricsCard>

                    {/* Active Assignment Section */}
                    {assignment.isLoading && (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#5B403A' }}>
                            Loading current task…
                        </div>
                    )}

                    {!assignment.isLoading && !assignment.data && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '2.5rem 1rem',
                                background: '#FFFFFF',
                                borderRadius: '0.75rem',
                                border: '1px solid #E3E1EC',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '3rem', color: '#8F7069', marginBottom: '0.5rem' }}
                            >
                                two_wheeler
                            </span>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>
                                Ready for Assignments
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#5B403A' }}>
                                No active delivery assignment right now. You are online and ready to
                                receive orders in Badarpur Town Zone.
                            </p>
                        </div>
                    )}

                    {assignment.data && (
                        <>
                            {/* Active Delivery Hero Card */}
                            <TaskCard>
                                <TaskBanner>
                                    <div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.375rem',
                                            }}
                                        >
                                            <TaskStatusChip>Active Delivery</TaskStatusChip>
                                            <OrderIdText>#{orderId || 'ORD-1052'}</OrderIdText>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                color: '#5B403A',
                                                fontSize: '0.75rem',
                                                marginTop: '0.25rem',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '14px' }}
                                            >
                                                schedule
                                            </span>
                                            <span>14 mins total trip • 2.4 km</span>
                                        </div>
                                    </div>

                                    <div>
                                        <PayoutAmount>₹65</PayoutAmount>
                                        <PayoutSub>₹50 Base + ₹15 Surge</PayoutSub>
                                    </div>
                                </TaskBanner>

                                <WaypointsList>
                                    {/* Point A: Pickup */}
                                    <WaypointRow>
                                        <WaypointConnector />
                                        <WaypointIconNode $type="pickup">
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '16px' }}
                                            >
                                                storefront
                                            </span>
                                        </WaypointIconNode>

                                        <WaypointBox>
                                            <WaypointHeader>
                                                <WaypointTag>
                                                    {deliveryStatus === 'ASSIGNED' || deliveryStatus === 'ACCEPTED'
                                                        ? 'PICKUP AT STORE'
                                                        : 'PICKUP COMPLETED'}
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '14px' }}
                                                    >
                                                        check_circle
                                                    </span>
                                                </WaypointTag>
                                                <ShelfBadge>Bay #2 Shelf</ShelfBadge>
                                            </WaypointHeader>
                                            <WaypointName>Maa Tara Groceries</WaypointName>
                                            <WaypointAddress>
                                                Station Road, Badarpur, Sribhumi
                                            </WaypointAddress>

                                            <ManifestStrip>
                                                <span
                                                    style={{
                                                        color: '#8F7069',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '15px' }}
                                                    >
                                                        shopping_bag
                                                    </span>
                                                    3 Items Packed:
                                                </span>
                                                <span
                                                    style={{
                                                        fontWeight: 700,
                                                        maxWidth: '180px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    Oil 1L, Butter 500g, Salt 1kg
                                                </span>
                                            </ManifestStrip>
                                        </WaypointBox>
                                    </WaypointRow>

                                    {/* Point B: Destination Drop */}
                                    <WaypointRow>
                                        <WaypointIconNode $type="drop">
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '16px' }}
                                            >
                                                location_on
                                            </span>
                                        </WaypointIconNode>

                                        <WaypointBox $highlight>
                                            <WaypointHeader>
                                                <WaypointTag $color="#FF5733">
                                                    CURRENT DESTINATION
                                                    <PulsingDot />
                                                </WaypointTag>
                                                <span
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        fontWeight: 700,
                                                        color: '#5B403A',
                                                    }}
                                                >
                                                    0.8 km remaining
                                                </span>
                                            </WaypointHeader>

                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'space-between',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                <div>
                                                    <WaypointName>Rahul S.</WaypointName>
                                                    <WaypointAddress>
                                                        House #42, Netaji Subhash Road
                                                    </WaypointAddress>
                                                    <WaypointAddress style={{ color: '#8F7069' }}>
                                                        Near Kali Mandir, Badarpur
                                                    </WaypointAddress>
                                                </div>

                                                <ActionIconButton
                                                    href="tel:+919876543210"
                                                    aria-label="Call Customer"
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        call
                                                    </span>
                                                </ActionIconButton>
                                            </div>

                                            <InstructionBox>
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{
                                                        fontSize: '16px',
                                                        color: '#FF5733',
                                                        flexShrink: 0,
                                                        marginTop: '1px',
                                                    }}
                                                >
                                                    info
                                                </span>
                                                <span>
                                                    <strong>Instruction:</strong> Leave at door if
                                                    not answering, call once arrived.
                                                </span>
                                            </InstructionBox>

                                            <NavMapsButton
                                                type="button"
                                                onClick={() =>
                                                    window.open(
                                                        'https://maps.google.com/?q=Badarpur+Assam',
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '16px', color: '#006398' }}
                                                >
                                                    navigation
                                                </span>
                                                <span>Open in Google Maps / Turn-by-Turn</span>
                                            </NavMapsButton>
                                        </WaypointBox>
                                    </WaypointRow>
                                </WaypointsList>
                            </TaskCard>

                            {/* Checklist Section */}
                            <ChecklistCard>
                                <ChecklistHeader>
                                    <span>Order Fulfillment Checklist</span>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 700,
                                            backgroundColor: '#7CF994',
                                            color: '#007230',
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px',
                                        }}
                                    >
                                        {deliveryStatus === 'ASSIGNED' && 'Step 1 of 6'}
                                        {deliveryStatus === 'ACCEPTED' && 'Step 3 of 6'}
                                        {deliveryStatus === 'PICKED_UP' && 'Step 4 of 6'}
                                        {deliveryStatus === 'OUT_FOR_DELIVERY' && 'Step 5 of 6'}
                                        {deliveryStatus === 'DELIVERED' && 'Completed'}
                                    </span>
                                </ChecklistHeader>

                                {/* Steps */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <ChecklistStepRow
                                        $done={
                                            deliveryStatus === 'ACCEPTED' ||
                                            deliveryStatus === 'PICKED_UP' ||
                                            deliveryStatus === 'OUT_FOR_DELIVERY' ||
                                            deliveryStatus === 'DELIVERED'
                                        }
                                        $active={deliveryStatus === 'ASSIGNED'}
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
                                                style={{ fontSize: '18px', color: '#006E2D' }}
                                            >
                                                check_circle
                                            </span>
                                            <span>1. Accept Delivery Assignment</span>
                                        </div>
                                        <span>11:42 AM</span>
                                    </ChecklistStepRow>

                                    <ChecklistStepRow
                                        $done={
                                            deliveryStatus === 'PICKED_UP' ||
                                            deliveryStatus === 'OUT_FOR_DELIVERY' ||
                                            deliveryStatus === 'DELIVERED'
                                        }
                                        $active={deliveryStatus === 'ACCEPTED'}
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
                                                style={{ fontSize: '18px', color: '#006E2D' }}
                                            >
                                                check_circle
                                            </span>
                                            <span>2. Arrived at Merchant Store</span>
                                        </div>
                                        <span>11:48 AM</span>
                                    </ChecklistStepRow>

                                    <ChecklistStepRow
                                        $done={
                                            deliveryStatus === 'OUT_FOR_DELIVERY' ||
                                            deliveryStatus === 'DELIVERED'
                                        }
                                        $active={deliveryStatus === 'PICKED_UP'}
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
                                                style={{ fontSize: '18px', color: '#006E2D' }}
                                            >
                                                check_circle
                                            </span>
                                            <span>3. Collect Parcels & Confirm Pickup</span>
                                        </div>
                                        <span style={{ color: '#006E2D', fontWeight: 700 }}>
                                            Verified PIN
                                        </span>
                                    </ChecklistStepRow>

                                    <ChecklistStepRow
                                        $done={deliveryStatus === 'DELIVERED'}
                                        $active={deliveryStatus === 'OUT_FOR_DELIVERY'}
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
                                                style={{ fontSize: '18px', color: '#FF5733' }}
                                            >
                                                two_wheeler
                                            </span>
                                            <span>4. Out for Delivery</span>
                                        </div>
                                        <span
                                            style={{
                                                backgroundColor: '#FF5733',
                                                color: '#FFFFFF',
                                                padding: '0.125rem 0.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.6875rem',
                                            }}
                                        >
                                            ETA 6 Mins
                                        </span>
                                    </ChecklistStepRow>

                                    {/* Step 5: PIN Entry Cluster */}
                                    <div
                                        style={{
                                            paddingTop: '0.5rem',
                                            borderTop: '1px solid #E3E1EC',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: '0.25rem',
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
                                                    style={{ fontSize: '18px', color: '#FF5733' }}
                                                >
                                                    pin
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    5. Customer Delivery PIN
                                                </span>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#FFDAD6',
                                                    color: '#BA1A1A',
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: '9999px',
                                                }}
                                            >
                                                Required
                                            </span>
                                        </div>

                                        <p
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#5B403A',
                                                margin: '0 0 0.5rem',
                                            }}
                                        >
                                            Ask Rahul S. for the 6-digit drop-off authentication PIN
                                            from his Dropzo app.
                                        </p>

                                        <PinCluster>
                                            {pinDigits.map((val, idx) => (
                                                <PinInput
                                                    key={idx}
                                                    id={`pin-input-${idx}`}
                                                    aria-label={`Digit ${idx + 1}`}
                                                    type="text"
                                                    maxLength={1}
                                                    inputMode="numeric"
                                                    value={val}
                                                    onChange={(e) =>
                                                        handlePinChange(idx, e.target.value)
                                                    }
                                                />
                                            ))}
                                        </PinCluster>

                                        {verifyMessage && (
                                            <div
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: verifyMessage.includes('completed')
                                                        ? '#006E2D'
                                                        : '#BA1A1A',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                {verifyMessage}
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 6: COD Cash Collection */}
                                    <CodCollectCard>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            <CodIconWrap>
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '18px' }}
                                                >
                                                    payments
                                                </span>
                                            </CodIconWrap>
                                            <div>
                                                <span
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        color: '#5B403A',
                                                        display: 'block',
                                                    }}
                                                >
                                                    Payment Mode: Cash on Delivery
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.9375rem',
                                                        fontWeight: 800,
                                                        color: '#1A1B22',
                                                    }}
                                                >
                                                    Collect ₹{assignment.data.cod_amount_due ?? '340.00'}
                                                </span>
                                            </div>
                                        </div>

                                        <UpiQrButton
                                            type="button"
                                            onClick={() => setIsQrModalOpen(true)}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '15px' }}
                                            >
                                                qr_code_2
                                            </span>
                                            <span>UPI QR</span>
                                        </UpiQrButton>
                                    </CodCollectCard>
                                </div>
                            </ChecklistCard>

                            {/* Optional Rejection / Failure Drawers */}
                            {deliveryStatus === 'ASSIGNED' && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => setShowRejectForm(!showRejectForm)}
                                    >
                                        Reject Assignment
                                    </SecondaryButton>
                                </div>
                            )}

                            {showRejectForm && (
                                <ActionDrawer>
                                    <div
                                        style={{
                                            fontSize: '0.8125rem',
                                            fontWeight: 700,
                                            marginBottom: '0.375rem',
                                        }}
                                    >
                                        Provide Rejection Reason
                                    </div>
                                    <ReasonInput
                                        placeholder="Reason (required)"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                    <ActionButtonGroup>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => setShowRejectForm(false)}
                                        >
                                            Cancel
                                        </SecondaryButton>
                                        <DangerActionButton
                                            type="button"
                                            disabled={
                                                rejectReason.length < 3 || reject.isPending
                                            }
                                            onClick={() => reject.mutate(rejectReason)}
                                        >
                                            Confirm reject
                                        </DangerActionButton>
                                    </ActionButtonGroup>
                                </ActionDrawer>
                            )}

                            {deliveryStatus === 'OUT_FOR_DELIVERY' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <SecondaryButton
                                        type="button"
                                        onClick={() => setShowFailForm(!showFailForm)}
                                        style={{ color: '#BA1A1A', borderColor: '#FFDAD6' }}
                                    >
                                        Report failed delivery
                                    </SecondaryButton>
                                </div>
                            )}

                            {showFailForm && (
                                <ActionDrawer>
                                    <div
                                        style={{
                                            fontSize: '0.8125rem',
                                            fontWeight: 700,
                                            marginBottom: '0.375rem',
                                            color: '#BA1A1A',
                                        }}
                                    >
                                        Report Delivery Handover Failure
                                    </div>
                                    <ReasonInput
                                        placeholder="Failure reason (customer unreachable, etc.)"
                                        value={failReason}
                                        onChange={(e) => setFailReason(e.target.value)}
                                    />
                                    <ActionButtonGroup>
                                        <SecondaryButton
                                            type="button"
                                            onClick={() => setShowFailForm(false)}
                                        >
                                            Cancel
                                        </SecondaryButton>
                                        <DangerActionButton
                                            type="button"
                                            disabled={failReason.length < 3 || reportFailure.isPending}
                                            onClick={() => reportFailure.mutate(failReason)}
                                        >
                                            Confirm failure
                                        </DangerActionButton>
                                    </ActionButtonGroup>
                                </ActionDrawer>
                            )}
                        </>
                    )}

                    {/* Dispatch Desk Support Pill */}
                    <DispatchHelpCard>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px', color: '#8F7069' }}
                            >
                                support_agent
                            </span>
                            <span style={{ color: '#5B403A', fontWeight: 600 }}>
                                Need Help? Contact Badarpur Dispatch
                            </span>
                        </div>
                        <a
                            href="tel:+919876543210"
                            style={{
                                color: '#FF5733',
                                fontWeight: 700,
                                textDecoration: 'none',
                            }}
                        >
                            Call Hub
                        </a>
                    </DispatchHelpCard>
                </ContentCanvas>

                {/* Persistent Floating Rider Action CTA Bar */}
                {assignment.data && (
                    <FloatingCtaBar>
                        {deliveryStatus === 'ASSIGNED' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <PrimaryCtaButton
                                    type="button"
                                    disabled={accept.isPending}
                                    onClick={() => accept.mutate()}
                                >
                                    <span>Accept</span>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        arrow_forward
                                    </span>
                                </PrimaryCtaButton>
                                <SecondaryButton
                                    type="button"
                                    onClick={() => setShowRejectForm(true)}
                                    style={{
                                        borderRadius: '9999px',
                                        padding: '0.875rem 1.25rem',
                                        color: '#BA1A1A',
                                    }}
                                >
                                    Reject
                                </SecondaryButton>
                            </div>
                        )}

                        {deliveryStatus === 'ACCEPTED' && (
                            <PrimaryCtaButton
                                type="button"
                                disabled={collect.isPending}
                                onClick={() => collect.mutate()}
                            >
                                <span>Confirm collected from store</span>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                >
                                    arrow_forward
                                </span>
                            </PrimaryCtaButton>
                        )}

                        {deliveryStatus === 'PICKED_UP' && (
                            <PrimaryCtaButton
                                type="button"
                                disabled={outForDelivery.isPending}
                                onClick={() => outForDelivery.mutate()}
                            >
                                <span>Mark out for delivery</span>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                >
                                    two_wheeler
                                </span>
                            </PrimaryCtaButton>
                        )}

                        {deliveryStatus === 'OUT_FOR_DELIVERY' && (
                            <PrimaryCtaButton
                                type="button"
                                disabled={
                                    deliveryCodeString.length !== 6 || verifyDelivery.isPending
                                }
                                onClick={() => verifyDelivery.mutate(deliveryCodeString)}
                            >
                                <span>Verify Customer PIN & Complete Delivery</span>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                >
                                    arrow_forward
                                </span>
                            </PrimaryCtaButton>
                        )}
                    </FloatingCtaBar>
                )}

                {/* Bottom Navigation Bar */}
                <BottomNav>
                    <NavTab href="#orders" $active>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px' }}
                        >
                            receipt_long
                        </span>
                        <NavTabLabel $active>Orders</NavTabLabel>
                    </NavTab>

                    <NavTab href="#inventory">
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px' }}
                        >
                            inventory_2
                        </span>
                        <NavTabLabel>Inventory</NavTabLabel>
                    </NavTab>

                    <NavTab href="#metrics">
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px' }}
                        >
                            monitoring
                        </span>
                        <NavTabLabel>Metrics</NavTabLabel>
                    </NavTab>

                    <NavTab href="#store">
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '18px' }}
                        >
                            store
                        </span>
                        <NavTabLabel>Store</NavTabLabel>
                    </NavTab>
                </BottomNav>

                {/* UPI QR Modal */}
                {isQrModalOpen && (
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
                                maxWidth: '320px',
                                width: '100%',
                                textAlign: 'center',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700 }}>
                                Customer UPI QR
                            </h4>
                            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#5B403A' }}>
                                Scan via Google Pay, PhonePe, or Paytm to collect ₹
                                {assignment.data?.cod_amount_due ?? '340.00'}
                            </p>
                            <div
                                style={{
                                    width: '180px',
                                    height: '180px',
                                    margin: '0 auto 1rem',
                                    border: '2px dashed #006E2D',
                                    borderRadius: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F4F2FD',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '96px', color: '#006E2D' }}
                                >
                                    qr_code_2
                                </span>
                            </div>
                            <PrimaryCtaButton
                                type="button"
                                onClick={() => setIsQrModalOpen(false)}
                                style={{ padding: '0.625rem 1rem' }}
                            >
                                Close QR
                            </PrimaryCtaButton>
                        </div>
                    </div>
                )}
            </MobileContainer>
        </PageViewport>
    );
}
