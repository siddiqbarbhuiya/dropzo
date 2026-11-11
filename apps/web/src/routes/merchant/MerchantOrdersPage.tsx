import { useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { Keypad } from '../../components/ui';
import { media } from '../../theme';
import type { OrderStatus } from '@dropzo/api-client';

// ==================== ANIMATIONS ====================

const pulseRing = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

// ==================== STYLED COMPONENTS ====================

const Container = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
    user-select: none;
    padding-bottom: 7rem;

    ${media.desktop} {
        padding-bottom: 2rem;
    }
`;

// --- Top App Bar ---
const TopBar = styled.header`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.75rem 1rem;
    position: sticky;
    top: 0;
    z-index: 40;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    ${media.desktop} {
        padding: 0.75rem 1.5rem;
    }
`;

const TopBarInner = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const BrandSection = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const StoreLogoBox = styled.div`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: rgba(183, 35, 1, 0.12);
    color: #b72301;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    flex-shrink: 0;
`;

const BrandTextCol = styled.div`
    min-width: 0;
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    line-height: 1;
`;

const BrandTitle = styled.span`
    font-size: 1rem;
    font-weight: 800;
    color: #b72301;
    letter-spacing: -0.01em;
`;

const RoleBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-weight: 700;
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
`;

const LiveBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 800;
    background: #7cf994;
    color: #007230;
`;

const LivePulseDot = styled.span`
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 9999px;
    background: #007230;
    animation: ${pulseRing} 1.5s infinite;
`;

const SubTextRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.75rem;
    margin-top: 0.25rem;
`;

const PosStationTag = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    color: #006e2d;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.05rem 0.375rem;
    border-radius: 0.25rem;
    margin-left: 0.25rem;
`;

const ActionCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const SoundAlertButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
    border: 1px solid
        ${({ $active }) => ($active ? 'rgba(183, 35, 1, 0.4)' : 'rgba(0, 0, 0, 0.15)')};
    background: ${({ $active }) => ($active ? 'rgba(183, 35, 1, 0.1)' : 'transparent')};
    color: ${({ $active }) => ($active ? '#b72301' : '#64748b')};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ $active }) => ($active ? 'rgba(183, 35, 1, 0.18)' : '#f1f5f9')};
    }
`;

const QuickVerifyButton = styled.button`
    display: none;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;

    ${media.tablet} {
        display: flex;
    }

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
`;

const StoreStatusToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHigh};

    ${media.desktop} {
        display: none;
    }
`;

const StoreOpenSwitch = styled.button<{ $open: boolean }>`
    width: 2.75rem;
    height: 1.5rem;
    border-radius: 9999px;
    background: ${({ $open }) => ($open ? '#006E2D' : '#cbd5e1')};
    border: none;
    position: relative;
    cursor: pointer;
    transition: background 0.2s ease;

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${({ $open }) => ($open ? 'calc(100% - 1.25rem - 2px)' : '2px')};
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 9999px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: left 0.2s ease;
    }
`;

// --- KPI Metrics Sub-Header ---
const KpiSection = styled.section`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.75rem 1rem;

    ${media.desktop} {
        padding: 0.875rem 1.5rem;
    }
`;

const KpiGrid = styled.div`
    max-width: 1720px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;

    ${media.desktop} {
        grid-template-columns: repeat(6, 1fr);
        gap: 0.75rem;
    }
`;

const KpiCard = styled.div<{ $borderAccent?: string }>`
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: 0.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid
        ${({ $borderAccent, theme }) => $borderAccent || theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: relative;
    overflow: hidden;

    ${media.desktop} {
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
`;

const KpiValue = styled.div<{ $color?: string }>`
    font-size: 1.25rem;
    font-weight: 800;
    color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
    line-height: 1.2;
    margin-top: 0.125rem;

    ${media.desktop} {
        font-size: 1.5rem;
    }
`;

const KpiLabel = styled.div`
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const KpiIcon = styled.div<{ $bg: string; $color: string }>`
    display: none;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    align-items: center;
    justify-content: center;

    ${media.desktop} {
        display: flex;
    }
`;

// --- Main 12-Column POS Layout ---
const MainContent = styled.main`
    max-width: 1720px;
    width: 100%;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;

    ${media.desktop} {
        grid-template-columns: repeat(12, 1fr);
        padding: 1.5rem;
    }
`;

const LeftFeedCol = styled.section`
    display: flex;
    flex-direction: column;
    gap: 1rem;

    ${media.desktop} {
        grid-column: span 8;
    }
`;

const RightTerminalCol = styled.section`
    display: flex;
    flex-direction: column;
    gap: 1rem;

    ${media.desktop} {
        grid-column: span 4;
    }
`;

// --- Status Filter Bar ---
const FilterRow = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 0.5rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const TabsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const TabButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 700;
    border: 1px solid
        ${({ $active, theme }) => ($active ? '#b72301' : theme.colors.surfaceContainerHighest)};
    background: ${({ $active }) => ($active ? '#b72301' : '#ffffff')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#334155')};
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ $active }) => ($active ? '#a01f01' : '#f8fafc')};
    }
`;

const TabCountBadge = styled.span<{ $active: boolean }>`
    background: ${({ $active }) => ($active ? '#ffffff' : '#f1f5f9')};
    color: ${({ $active }) => ($active ? '#b72301' : '#475569')};
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.1rem 0.375rem;
    border-radius: 9999px;
`;

const SearchInputWrap = styled.div`
    position: relative;
    width: 100%;

    ${media.tablet} {
        width: 16rem;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 0.45rem 0.75rem 0.45rem 2.25rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textPrimary};

    &:focus {
        outline: none;
        border-color: #b72301;
    }
`;

// --- Order Cards ---
const OrderCard = styled.div<{ $borderHighlight?: string }>`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 2px solid
        ${({ $borderHighlight, theme }) => $borderHighlight || theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    position: relative;
    transition: box-shadow 0.15s ease;

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
`;

const UrgentRibbon = styled.div`
    background: #ffdad3;
    color: #580c00;
    padding: 0.375rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 800;
`;

const UrgentLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #b72301;
`;

const UrgentTimerBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #ffffff;
    color: #b72301;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-family: monospace;
    font-weight: 800;
`;

const OrderCardBody = styled.div`
    padding: 1rem;

    ${media.desktop} {
        padding: 1.25rem;
    }
`;

const OrderHeaderRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const OrderIdTitle = styled.h3`
    font-size: 1.125rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const CustomerMeta = styled.p`
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.25rem 0 0 0;
`;

const TotalPriceDisplay = styled.div`
    text-align: right;
`;

const TotalAmountText = styled.div`
    font-size: 1.25rem;
    font-weight: 800;
    color: #b72301;
`;

const PaymentMethodLabel = styled.div`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 600;
`;

const ChecklistSection = styled.div`
    padding: 0.75rem 0;
`;

const ChecklistHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.02em;
`;

const ChecklistGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;

    ${media.desktop} {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const ChecklistItem = styled.label<{ $checked?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.625rem;
    border-radius: 0.75rem;
    border: 1px solid
        ${({ $checked, theme }) => ($checked ? '#7cf994' : theme.colors.surfaceContainerHighest)};
    background: ${({ $checked, theme }) =>
        $checked ? 'rgba(124, 249, 148, 0.1)' : theme.colors.surfaceContainerLow};
    cursor: pointer;
    transition: all 0.15s ease;
`;

const ItemCheckCheckbox = styled.input`
    margin-top: 0.125rem;
    accent-color: #b72301;
    cursor: pointer;
`;

const ItemInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const ItemName = styled.div<{ $checked?: boolean }>`
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${({ $checked, theme }) =>
        $checked ? theme.colors.textSecondary : theme.colors.textPrimary};
    text-decoration: ${({ $checked }) => ($checked ? 'line-through' : 'none')};
    display: flex;
    justify-content: space-between;
`;

const ItemSub = styled.div`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-top: 0.125rem;
`;

const OrderActionFooter = styled.div`
    padding-top: 0.75rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
`;

const RejectButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.625rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    font-weight: 700;
    border: 1px solid #fca5a5;
    background: #fff1f2;
    color: #ba1a1a;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: #fee2e2;
    }
`;

const AcceptButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1.25rem;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    font-weight: 800;
    border: none;
    background: #b72301;
    color: #ffffff;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(183, 35, 1, 0.3);
    transition: all 0.15s ease;

    &:hover {
        background: #991e01;
    }
`;

const MarkReadyButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 800;
    border: none;
    background: #006e2d;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
        background: #005623;
    }
`;

const LoadKeypadButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
`;

// --- Counter PIN Validator Widget (Right Col) ---
const PinValidatorWidget = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 2px solid rgba(183, 35, 1, 0.3);
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const PinWidgetHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const PinWidgetTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const PinIconBox = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: rgba(183, 35, 1, 0.15);
    color: #b72301;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const PinInputRow = styled.div`
    position: relative;
    margin-top: 0.5rem;
`;

const PinInputField = styled.input`
    width: 100%;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.4em;
    padding: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 2px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 0.75rem;
    font-family: monospace;
    color: ${({ theme }) => theme.colors.textPrimary};

    &:focus {
        outline: none;
        border-color: #b72301;
    }
`;

const ReleaseOrderButton = styled.button`
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    font-weight: 800;
    border: none;
    background: #006e2d;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 2px 6px rgba(0, 110, 45, 0.25);
    transition: all 0.15s ease;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        background: #005623;
    }
`;

// --- Recent Counter Handoffs Card ---
const RecentHandoffsCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const HandoffList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
`;

const HandoffItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerLow};

    &:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
`;

// --- Mobile Bottom Navigation ---
const MobileNav = styled.nav`
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.375rem 0.5rem;

    ${media.desktop} {
        display: none;
    }
`;

const MobileNavItem = styled(Link)<{ $active?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    text-decoration: none;
    color: ${({ $active }) => ($active ? '#b72301' : '#64748b')};
    background: ${({ $active }) => ($active ? 'rgba(183, 35, 1, 0.1)' : 'transparent')};
    font-size: 0.6875rem;
    font-weight: 700;
`;

// ==================== COMPONENT ====================

export function MerchantOrdersPage() {
    const queryClient = useQueryClient();
    const [statusTab, setStatusTab] = useState<'INCOMING' | 'PACKING' | 'READY' | 'COMPLETED'>(
        'INCOMING',
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [isStoreOpen, setIsStoreOpen] = useState(true);
    const [isSoundAlertOn, setIsSoundAlertOn] = useState(true);
    const [selectedOrderForPin, setSelectedOrderForPin] = useState<string>('order-demo-ready');
    const [counterPin, setCounterPin] = useState('');
    const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

    // Picked items tracker for packing checklists
    const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({
        'item-1': true,
        'item-2': true,
        'item-3': true,
    });

    const toggleItemPicked = (itemId: string) => {
        setPickedItems((prev) => ({
            ...prev,
            [itemId]: !prev[itemId],
        }));
    };

    // 1. Fetch own store
    const storesQuery = useQuery({
        queryKey: ['merchant-stores'],
        queryFn: () => apiClient.listOwnStores({ page: 1, limit: 20 }),
    });
    const store = storesQuery.data?.data?.[0];
    const storeId = store?.id;

    // 2. Fetch merchant orders
    const ordersQuery = useQuery({
        queryKey: ['merchant-orders', storeId],
        queryFn: () =>
            apiClient.listMerchantOrders(storeId!, {
                page: 1,
                limit: 50,
            }),
        enabled: !!storeId,
    });

    // 3. Mutations for order actions
    const currentStoreId = storeId || 'store-1';

    const acceptMutation = useMutation({
        mutationFn: (orderId: string) => apiClient.acceptOrder(currentStoreId, orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (orderId: string) =>
            apiClient.rejectOrder(currentStoreId, orderId, 'Out of stock'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
        },
    });

    const markReadyMutation = useMutation({
        mutationFn: (orderId: string) => apiClient.markOrderReady(currentStoreId, orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
        },
    });

    const verifyPickupMutation = useMutation({
        mutationFn: (params: { orderId: string; pickup_code: string }) =>
            apiClient.verifyPickupCode(currentStoreId, params.orderId, params.pickup_code),
        onSuccess: () => {
            setVerificationFeedback('Order PIN verified successfully! Order released.');
            setCounterPin('');
            queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
            setTimeout(() => setVerificationFeedback(null), 4000);
        },
        onError: (err: any) => {
            setVerificationFeedback(err?.message || 'Invalid PIN code. Try again.');
        },
    });

    // Fallback demonstration orders if store has 0 orders
    const demoOrders = useMemo(() => {
        const live = ordersQuery.data?.data || [];
        if (live.length > 0) return live;

        return [
            {
                id: 'order-demo-1',
                order_number: 'DZ-2026-8941',
                status: 'CREATED' as OrderStatus,
                fulfilment_type: 'PICKUP',
                total_amount: '555.00',
                placed_at: new Date(Date.now() - 45000).toISOString(),
                payment_method: 'COD',
                items: [
                    {
                        id: 'item-demo-1',
                        product_name_snapshot: 'Fortune Sunlite Oil',
                        variant_snapshot: '1L Pouch • Shelf #A-04',
                        sku_snapshot: 'SKU-OIL-01',
                        quantity: 1,
                        unit_price: '145.00',
                        tax_amount: '0.00',
                        line_total: '145.00',
                    },
                    {
                        id: 'item-demo-2',
                        product_name_snapshot: 'India Gate Basmati Rice',
                        variant_snapshot: '1kg Classic • Shelf #R-02',
                        sku_snapshot: 'SKU-RICE-02',
                        quantity: 2,
                        unit_price: '85.00',
                        tax_amount: '0.00',
                        line_total: '170.00',
                    },
                    {
                        id: 'item-demo-3',
                        product_name_snapshot: 'Amul Pasteurized Butter',
                        variant_snapshot: '500g Carton • Chiller #C-01',
                        sku_snapshot: 'SKU-AMUL-03',
                        quantity: 1,
                        unit_price: '240.00',
                        tax_amount: '0.00',
                        line_total: '240.00',
                    },
                ],
            },
            {
                id: 'order-demo-2',
                order_number: 'DZ-2026-8938',
                status: 'PREPARING' as OrderStatus,
                fulfilment_type: 'PICKUP',
                total_amount: '380.00',
                placed_at: new Date(Date.now() - 360000).toISOString(),
                payment_method: 'ONLINE',
                items: [
                    {
                        id: 'item-1',
                        product_name_snapshot: 'Aashirvaad Atta',
                        variant_snapshot: '5kg Pack • Shelf #A-01',
                        sku_snapshot: 'SKU-ATTA',
                        quantity: 1,
                        unit_price: '240.00',
                        tax_amount: '0.00',
                        line_total: '240.00',
                    },
                    {
                        id: 'item-2',
                        product_name_snapshot: 'Tata Salt',
                        variant_snapshot: '1kg Pouch • Shelf #S-02',
                        sku_snapshot: 'SKU-SALT',
                        quantity: 1,
                        unit_price: '28.00',
                        tax_amount: '0.00',
                        line_total: '28.00',
                    },
                    {
                        id: 'item-3',
                        product_name_snapshot: 'Maggi 2-Minute Noodles',
                        variant_snapshot: '4-Pack • Shelf #N-03',
                        sku_snapshot: 'SKU-MAGGI',
                        quantity: 2,
                        unit_price: '56.00',
                        tax_amount: '0.00',
                        line_total: '112.00',
                    },
                ],
            },
            {
                id: 'order-demo-ready',
                order_number: 'DZ-2026-8930',
                status: 'READY' as OrderStatus,
                fulfilment_type: 'PICKUP',
                total_amount: '240.00',
                placed_at: new Date(Date.now() - 600000).toISOString(),
                payment_method: 'COD',
                items: [
                    {
                        id: 'item-ready-1',
                        product_name_snapshot: 'Fortune Rice Bran Oil',
                        variant_snapshot: '1L Bottle',
                        sku_snapshot: 'SKU-BRAN',
                        quantity: 1,
                        unit_price: '160.00',
                        tax_amount: '0.00',
                        line_total: '160.00',
                    },
                    {
                        id: 'item-ready-2',
                        product_name_snapshot: 'Parle-G Gold Biscuits',
                        variant_snapshot: '1kg Family Pack',
                        sku_snapshot: 'SKU-PARLE',
                        quantity: 1,
                        unit_price: '80.00',
                        tax_amount: '0.00',
                        line_total: '80.00',
                    },
                ],
            },
        ];
    }, [ordersQuery.data]);

    // Filter by tab
    const filteredOrders = useMemo(() => {
        return demoOrders.filter((order) => {
            const matchesSearch =
                !searchQuery ||
                order.order_number.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusTab === 'INCOMING') {
                return order.status === 'CREATED' || order.status === 'ACCEPTED';
            }
            if (statusTab === 'PACKING') {
                return order.status === 'PREPARING';
            }
            if (statusTab === 'READY') {
                return order.status === 'READY';
            }
            if (statusTab === 'COMPLETED') {
                return order.status === 'COMPLETED' || order.status === 'DELIVERED';
            }
            return true;
        });
    }, [demoOrders, statusTab, searchQuery]);

    const counts = useMemo(() => {
        return {
            incoming: demoOrders.filter((o) => o.status === 'CREATED' || o.status === 'ACCEPTED')
                .length,
            packing: demoOrders.filter((o) => o.status === 'PREPARING').length,
            ready: demoOrders.filter((o) => o.status === 'READY').length,
            completed: demoOrders.filter(
                (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED',
            ).length,
        };
    }, [demoOrders]);

    return (
        <Container>
            {/* Top Bar with Live Dropzo Merchant Branding */}
            <TopBar>
                <TopBarInner>
                    <BrandSection>
                        <StoreLogoBox>
                            <span className="material-symbols-outlined">storefront</span>
                        </StoreLogoBox>
                        <BrandTextCol>
                            <TitleRow>
                                <BrandTitle>Dropzo Merchant</BrandTitle>
                                <RoleBadge>Merchant</RoleBadge>
                                <LiveBadge>
                                    <LivePulseDot />
                                    LIVE
                                </LiveBadge>
                            </TitleRow>
                            <SubTextRow>
                                <span style={{ fontWeight: 700 }}>
                                    {store?.name || 'Maa Tara Groceries'}
                                </span>
                                <span>•</span>
                                <span>Station Road, Badarpur</span>
                                <PosStationTag>POS #01</PosStationTag>
                            </SubTextRow>
                        </BrandTextCol>
                    </BrandSection>

                    <ActionCluster>
                        <SoundAlertButton
                            $active={isSoundAlertOn}
                            onClick={() => setIsSoundAlertOn(!isSoundAlertOn)}
                            aria-label={isSoundAlertOn ? 'Loud Alert On' : 'Loud Alert Muted'}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                            >
                                {isSoundAlertOn ? 'volume_up' : 'volume_off'}
                            </span>
                            <span className="hidden sm:inline">
                                {isSoundAlertOn ? 'LOUD ALERT ON' : 'MUTED'}
                            </span>
                        </SoundAlertButton>

                        <QuickVerifyButton
                            onClick={() => {
                                const input = document.getElementById('pin-input');
                                if (input) input.focus();
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                pin
                            </span>
                            <span>Verify Pickup PIN</span>
                        </QuickVerifyButton>

                        <StoreOpenSwitch
                            $open={isStoreOpen}
                            onClick={() => setIsStoreOpen(!isStoreOpen)}
                            aria-label={isStoreOpen ? 'Store Accepting Orders' : 'Store Closed'}
                            title={isStoreOpen ? 'Accepting Orders' : 'Store Paused'}
                        />
                    </ActionCluster>
                </TopBarInner>

                <StoreStatusToggleRow>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#006E2D' }}>
                        {isStoreOpen ? 'Accepting Orders' : 'Store Closed'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Fast Badarpur Counter Fulfillment
                    </span>
                </StoreStatusToggleRow>
            </TopBar>

            {/* KPI Metrics Sub-Header */}
            <KpiSection>
                <KpiGrid>
                    <KpiCard $borderAccent="rgba(183, 35, 1, 0.4)">
                        <div>
                            <KpiLabel>
                                <span>New</span>
                                <span
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '9999px',
                                        background: '#b72301',
                                    }}
                                />
                            </KpiLabel>
                            <KpiValue $color="#b72301">{counts.incoming || 3}</KpiValue>
                            <div
                                style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '2px' }}
                            >
                                Pending
                            </div>
                        </div>
                        <KpiIcon $bg="rgba(183, 35, 1, 0.12)" $color="#b72301">
                            <span className="material-symbols-outlined">
                                notification_important
                            </span>
                        </KpiIcon>
                    </KpiCard>

                    <KpiCard>
                        <div>
                            <KpiLabel>Prep</KpiLabel>
                            <KpiValue $color="#006398">{counts.packing || 4}</KpiValue>
                            <div
                                style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '2px' }}
                            >
                                Packing
                            </div>
                        </div>
                        <KpiIcon $bg="#cce5ff" $color="#006398">
                            <span className="material-symbols-outlined">inventory_2</span>
                        </KpiIcon>
                    </KpiCard>

                    <KpiCard>
                        <div>
                            <KpiLabel>Ready</KpiLabel>
                            <KpiValue $color="#006e2d">{counts.ready || 2}</KpiValue>
                            <div
                                style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '2px' }}
                            >
                                For Pickup
                            </div>
                        </div>
                        <KpiIcon $bg="#7cf994" $color="#006e2d">
                            <span className="material-symbols-outlined">countertops</span>
                        </KpiIcon>
                    </KpiCard>

                    <KpiCard>
                        <div>
                            <KpiLabel>Today</KpiLabel>
                            <KpiValue>₹4,820</KpiValue>
                            <div
                                style={{
                                    fontSize: '0.625rem',
                                    color: '#006e2d',
                                    fontWeight: 700,
                                    marginTop: '2px',
                                }}
                            >
                                26 Orders
                            </div>
                        </div>
                        <KpiIcon $bg="#eeedf7" $color="#1a1b22">
                            <span className="material-symbols-outlined">payments</span>
                        </KpiIcon>
                    </KpiCard>

                    <KpiCard className="hidden lg:flex">
                        <div>
                            <KpiLabel>Avg Prep</KpiLabel>
                            <KpiValue>
                                11{' '}
                                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                    mins
                                </span>
                            </KpiValue>
                            <div
                                style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '2px' }}
                            >
                                Target &lt; 15m
                            </div>
                        </div>
                        <KpiIcon $bg="#eeedf7" $color="#006e2d">
                            <span className="material-symbols-outlined">speed</span>
                        </KpiIcon>
                    </KpiCard>

                    <KpiCard className="hidden lg:flex">
                        <div>
                            <KpiLabel>On-Time</KpiLabel>
                            <KpiValue $color="#006e2d">98%</KpiValue>
                            <div
                                style={{
                                    fontSize: '0.625rem',
                                    color: '#006e2d',
                                    fontWeight: 700,
                                    marginTop: '2px',
                                }}
                            >
                                Verified SLA
                            </div>
                        </div>
                        <KpiIcon $bg="#7cf994" $color="#006e2d">
                            <span className="material-symbols-outlined">verified</span>
                        </KpiIcon>
                    </KpiCard>
                </KpiGrid>
            </KpiSection>

            {/* Main 12-Column POS Layout */}
            <MainContent>
                {/* Left/Center Column (8 cols): Status Tabs and Order Feed */}
                <LeftFeedCol>
                    {/* Status Tabs and Search */}
                    <FilterRow>
                        <TabsContainer>
                            <TabButton
                                $active={statusTab === 'INCOMING'}
                                onClick={() => setStatusTab('INCOMING')}
                                aria-label="Incoming Orders"
                            >
                                <span>Incoming</span>
                                <TabCountBadge $active={statusTab === 'INCOMING'}>
                                    {counts.incoming || 3}
                                </TabCountBadge>
                            </TabButton>

                            <TabButton
                                $active={statusTab === 'PACKING'}
                                onClick={() => setStatusTab('PACKING')}
                                aria-label="Packing Now Orders"
                            >
                                <span>Packing Now</span>
                                <TabCountBadge $active={statusTab === 'PACKING'}>
                                    {counts.packing || 4}
                                </TabCountBadge>
                            </TabButton>

                            <TabButton
                                $active={statusTab === 'READY'}
                                onClick={() => setStatusTab('READY')}
                                aria-label="Ready at Counter Orders"
                            >
                                <span>Ready at Counter</span>
                                <TabCountBadge $active={statusTab === 'READY'}>
                                    {counts.ready || 2}
                                </TabCountBadge>
                            </TabButton>

                            <TabButton
                                $active={statusTab === 'COMPLETED'}
                                onClick={() => setStatusTab('COMPLETED')}
                                aria-label="Completed Orders"
                            >
                                <span>Completed</span>
                                <TabCountBadge $active={statusTab === 'COMPLETED'}>
                                    28
                                </TabCountBadge>
                            </TabButton>
                        </TabsContainer>

                        <SearchInputWrap>
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    position: 'absolute',
                                    left: '0.625rem',
                                    top: '0.55rem',
                                    fontSize: '18px',
                                    color: '#64748b',
                                }}
                            >
                                search
                            </span>
                            <SearchInput
                                placeholder="Search order ID / phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label="Search orders"
                            />
                        </SearchInputWrap>
                    </FilterRow>

                    {/* Active Order Cards Feed */}
                    {filteredOrders.map((order) => {
                        const isIncoming =
                            order.status === 'CREATED' || order.status === 'ACCEPTED';
                        const isPacking = order.status === 'PREPARING';
                        const isReady = order.status === 'READY';

                        return (
                            <OrderCard
                                key={order.id}
                                $borderHighlight={isIncoming ? 'rgba(183, 35, 1, 0.6)' : undefined}
                            >
                                {isIncoming && (
                                    <UrgentRibbon>
                                        <UrgentLeft>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '18px' }}
                                            >
                                                alarm
                                            </span>
                                            <span>URGENT ACCEPTANCE REQUIRED</span>
                                        </UrgentLeft>
                                        <UrgentTimerBadge>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '14px' }}
                                            >
                                                timer
                                            </span>
                                            <span>45s left</span>
                                        </UrgentTimerBadge>
                                    </UrgentRibbon>
                                )}

                                <OrderCardBody>
                                    <OrderHeaderRow>
                                        <div>
                                            <OrderIdTitle>
                                                <span>#{order.order_number}</span>
                                                {isIncoming && (
                                                    <span
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            background: '#ffdad3',
                                                            color: '#8c1800',
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '0.375rem',
                                                        }}
                                                    >
                                                        Action Needed
                                                    </span>
                                                )}
                                                <span
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        background: '#eeedf7',
                                                        color: '#1a1b22',
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '0.375rem',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                    }}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{
                                                            fontSize: '14px',
                                                            color: '#006E2D',
                                                        }}
                                                    >
                                                        store
                                                    </span>
                                                    Store Counter Pickup
                                                </span>
                                            </OrderIdTitle>
                                            <CustomerMeta>
                                                Customer: <strong>Cameron Williamson</strong> • (+91
                                                94350 XXXXX) • Regular Shopper
                                            </CustomerMeta>
                                        </div>

                                        <TotalPriceDisplay>
                                            <PaymentMethodLabel>
                                                {order.payment_method === 'ONLINE'
                                                    ? 'Paid Online (UPI)'
                                                    : 'COD / Pay at Counter'}
                                            </PaymentMethodLabel>
                                            <TotalAmountText>
                                                ₹{Number(order.total_amount || 0).toFixed(0)}
                                            </TotalAmountText>
                                        </TotalPriceDisplay>
                                    </OrderHeaderRow>

                                    {/* Items Checklist with interactive pick boxes */}
                                    <ChecklistSection>
                                        <ChecklistHeader>
                                            <span>
                                                Items Checklist ({order.items?.length || 0} items)
                                            </span>
                                            <span
                                                style={{ color: '#b72301', textTransform: 'none' }}
                                            >
                                                Check off items as you pick
                                            </span>
                                        </ChecklistHeader>

                                        <ChecklistGrid>
                                            {order.items?.map((item: any) => {
                                                const isChecked = !!pickedItems[item.id];
                                                return (
                                                    <ChecklistItem
                                                        key={item.id}
                                                        $checked={isChecked}
                                                        onClick={() => toggleItemPicked(item.id)}
                                                    >
                                                        <ItemCheckCheckbox
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {}}
                                                            aria-label={`Picked ${item.product_name_snapshot}`}
                                                        />
                                                        <ItemInfo>
                                                            <ItemName $checked={isChecked}>
                                                                <span>
                                                                    {item.quantity}x{' '}
                                                                    {item.product_name_snapshot}
                                                                </span>
                                                                <span style={{ fontWeight: 800 }}>
                                                                    ₹
                                                                    {Number(
                                                                        item.line_total || 0,
                                                                    ).toFixed(0)}
                                                                </span>
                                                            </ItemName>
                                                            <ItemSub>
                                                                {item.variant_snapshot || '1 unit'}
                                                            </ItemSub>
                                                        </ItemInfo>
                                                    </ChecklistItem>
                                                );
                                            })}
                                        </ChecklistGrid>
                                    </ChecklistSection>

                                    {/* Action Buttons */}
                                    <OrderActionFooter>
                                        <div
                                            style={{
                                                fontSize: '0.8125rem',
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '16px', color: '#006398' }}
                                            >
                                                schedule
                                            </span>
                                            <span>
                                                Customer promised ready in <strong>15 mins</strong>
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}
                                        >
                                            {isIncoming && (
                                                <>
                                                    <RejectButton
                                                        type="button"
                                                        onClick={() =>
                                                            rejectMutation.mutate(order.id)
                                                        }
                                                        disabled={rejectMutation.isPending}
                                                    >
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '16px' }}
                                                        >
                                                            cancel
                                                        </span>
                                                        <span>Reject Order</span>
                                                    </RejectButton>
                                                    <AcceptButton
                                                        type="button"
                                                        onClick={() =>
                                                            acceptMutation.mutate(order.id)
                                                        }
                                                        disabled={acceptMutation.isPending}
                                                    >
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '18px' }}
                                                        >
                                                            check_circle
                                                        </span>
                                                        <span>Accept Order (Prep in 15m)</span>
                                                    </AcceptButton>
                                                </>
                                            )}

                                            {isPacking && (
                                                <MarkReadyButton
                                                    type="button"
                                                    onClick={() =>
                                                        markReadyMutation.mutate(order.id)
                                                    }
                                                    disabled={markReadyMutation.isPending}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        done_all
                                                    </span>
                                                    <span>Mark Ready for Pickup</span>
                                                </MarkReadyButton>
                                            )}

                                            {isReady && (
                                                <LoadKeypadButton
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedOrderForPin(order.id);
                                                        setCounterPin('8930');
                                                        const el =
                                                            document.getElementById('pin-input');
                                                        if (el) el.focus();
                                                    }}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        dialpad
                                                    </span>
                                                    <span>Load to Counter Keypad</span>
                                                </LoadKeypadButton>
                                            )}
                                        </div>
                                    </OrderActionFooter>
                                </OrderCardBody>
                            </OrderCard>
                        );
                    })}
                </LeftFeedCol>

                {/* Right Column (4 cols): Counter PIN Validator & Handoff Log */}
                <RightTerminalCol>
                    {/* PIN Validator Widget */}
                    <PinValidatorWidget>
                        <PinWidgetHeader>
                            <PinWidgetTitleRow>
                                <PinIconBox>
                                    <span className="material-symbols-outlined">pin</span>
                                </PinIconBox>
                                <div>
                                    <h4
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            color: '#1a1b22',
                                        }}
                                    >
                                        Counter PIN Validator
                                    </h4>
                                    <p
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#64748b',
                                            margin: 0,
                                        }}
                                    >
                                        Customer Pickup Verification (FR-PICK-001)
                                    </p>
                                </div>
                            </PinWidgetTitleRow>

                            <button
                                type="button"
                                style={{
                                    border: 'none',
                                    background: '#eeedf7',
                                    borderRadius: '0.5rem',
                                    padding: '0.375rem',
                                    cursor: 'pointer',
                                }}
                                title="QR Code Scanner Cam"
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '20px' }}
                                >
                                    qr_code_scanner
                                </span>
                            </button>
                        </PinWidgetHeader>

                        {/* PIN Input Box */}
                        <PinInputRow>
                            <div
                                style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    marginBottom: '0.25rem',
                                }}
                            >
                                ENTER 4 OR 6-DIGIT CUSTOMER PIN
                            </div>
                            <div style={{ position: 'relative' }}>
                                <PinInputField
                                    id="pin-input"
                                    type="text"
                                    maxLength={6}
                                    placeholder="• • • • • •"
                                    value={counterPin}
                                    onChange={(e) =>
                                        setCounterPin(e.target.value.replace(/\D/g, ''))
                                    }
                                    aria-label="Customer Pickup PIN"
                                />
                                {counterPin.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setCounterPin('')}
                                        style={{
                                            position: 'absolute',
                                            right: '0.75rem',
                                            top: '0.75rem',
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                        }}
                                        aria-label="Clear PIN"
                                    >
                                        <span className="material-symbols-outlined">backspace</span>
                                    </button>
                                )}
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: '0.375rem',
                                    fontSize: '0.6875rem',
                                }}
                            >
                                <span
                                    style={{
                                        color: '#006E2D',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '13px' }}
                                    >
                                        verified_user
                                    </span>
                                    FR-PICK-001 Enforced
                                </span>
                                <span style={{ color: '#ba1a1a', fontWeight: 600 }}>
                                    5-attempt lockout
                                </span>
                            </div>
                        </PinInputRow>

                        {/* On-Screen Numeric Keypad */}
                        <div style={{ marginTop: '0.75rem' }}>
                            <Keypad
                                value={counterPin}
                                onChange={setCounterPin}
                                maxLength={6}
                                disabled={verifyPickupMutation.isPending}
                            />
                        </div>

                        {/* Release Order Action */}
                        <ReleaseOrderButton
                            type="button"
                            disabled={counterPin.length < 4 || verifyPickupMutation.isPending}
                            onClick={() =>
                                verifyPickupMutation.mutate({
                                    orderId: selectedOrderForPin,
                                    pickup_code: counterPin,
                                })
                            }
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Verify & Release Order</span>
                        </ReleaseOrderButton>

                        {verificationFeedback && (
                            <div
                                style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: verificationFeedback.includes('successfully')
                                        ? '#ecfdf5'
                                        : '#fff1f2',
                                    color: verificationFeedback.includes('successfully')
                                        ? '#047857'
                                        : '#ba1a1a',
                                    textAlign: 'center',
                                }}
                            >
                                {verificationFeedback}
                            </div>
                        )}
                    </PinValidatorWidget>

                    {/* Recent Counter Handoffs Activity Log */}
                    <RecentHandoffsCard>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: '0.625rem',
                                borderBottom: '1px solid #eeedf7',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ color: '#b72301', fontSize: '18px' }}
                                >
                                    history
                                </span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>
                                    Recent Counter Handoffs
                                </span>
                            </div>
                            <span
                                style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}
                            >
                                Today
                            </span>
                        </div>

                        <HandoffList>
                            <HandoffItem>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                        #DZ-2026-8924 • Debasish N.
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        PIN Verified • 4 items (₹410)
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        14:22
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#006E2D',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Completed
                                    </div>
                                </div>
                            </HandoffItem>

                            <HandoffItem>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                        #DZ-2026-8919 • R. Mazumdar
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        QR Scanned • 1 item (₹125)
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        14:05
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#006E2D',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Completed
                                    </div>
                                </div>
                            </HandoffItem>

                            <HandoffItem>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                        #DZ-2026-8915 • Priya Roy
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        PIN Verified • 6 items (₹890)
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                                        13:48
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: '#006E2D',
                                            fontWeight: 700,
                                        }}
                                    >
                                        Completed
                                    </div>
                                </div>
                            </HandoffItem>
                        </HandoffList>

                        <div
                            style={{
                                marginTop: '0.75rem',
                                paddingTop: '0.5rem',
                                borderTop: '1px solid #eeedf7',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                            }}
                        >
                            <span style={{ color: '#64748b' }}>Need POS help?</span>
                            <a
                                href="#support"
                                style={{
                                    color: '#b72301',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '15px' }}
                                >
                                    support_agent
                                </span>
                                <span>Merchant Support</span>
                            </a>
                        </div>
                    </RecentHandoffsCard>
                </RightTerminalCol>
            </MainContent>

            {/* Mobile Bottom Navigation */}
            <MobileNav>
                <MobileNavItem to="/merchant/orders" $active>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        receipt_long
                    </span>
                    <span>Orders</span>
                </MobileNavItem>

                <MobileNavItem to="/merchant/inventory">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        inventory_2
                    </span>
                    <span>Inventory</span>
                </MobileNavItem>

                <MobileNavItem to="/merchant/metrics">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        monitoring
                    </span>
                    <span>Metrics</span>
                </MobileNavItem>

                <MobileNavItem to="/merchant/store">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        store
                    </span>
                    <span>Store</span>
                </MobileNavItem>
            </MobileNav>
        </Container>
    );
}
