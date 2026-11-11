import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import type { StoreListing } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import {
    Badge,
    Button,
    Input,
    Switch,
    SegmentedControl,
    Modal,
    LoadingState,
    ErrorState,
    EmptyState,
    Skeleton,
} from '../../components/ui';
import { typeScale, media } from '../../theme';

type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type StatusFilter = 'ALL' | StockState;

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    flex-direction: column;
    user-select: none;
    padding-bottom: 7rem;

    ${media.desktop} {
        padding-bottom: 2rem;
    }
`;

// Floating Barcode Scanner Dock (Mobile)
const FloatingBarcodeDock = styled.aside`
    position: fixed;
    bottom: 4.5rem;
    left: 0;
    right: 0;
    z-index: 30;
    padding: 0 1rem;
    display: flex;
    justify-content: center;
    pointer-events: none;

    ${media.desktop} {
        display: none;
    }
`;

const FloatingBarcodePill = styled.div`
    pointer-events: auto;
    background: #2f3038;
    color: #f1effa;
    padding: 0.625rem 1.25rem;
    border-radius: 9999px;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
    display: flex;
    align-items: center;
    gap: 0.625rem;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: transform 0.15s ease;

    &:active {
        transform: scale(0.98);
    }
`;

const BarcodeIconBadge = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background: #b72301;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

// Mobile Bottom Navigation Bar
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

// Top Navigation Bar
const TopBar = styled.header`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
    position: sticky;
    top: 0;
    z-index: 40;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
`;

const TopBarInner = styled.div`
    max-width: 1440px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

const BrandCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const StorefrontIconBox = styled.div`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    background: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 1px 3px 0 rgba(255, 87, 51, 0.3);
`;

const BrandTitles = styled.div`
    display: flex;
    flex-direction: column;
`;

const BrandTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const BrandHeading = styled.span`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    font-weight: 700;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.01em;
`;

const VersionTag = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const HubLocationSubtitle = styled.div`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 0.375rem;

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const TopCenterStatus = styled.div`
    display: none;
    align-items: center;
    gap: 1rem;

    ${media.desktop} {
        display: flex;
    }
`;

const AcceptingOrdersBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(124, 249, 148, 0.25);
    border: 1px solid ${({ theme }) => theme.colors.successContainer};
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    color: #007230;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
`;

const LivePulseDot = styled.span`
    position: relative;
    display: flex;
    height: 0.625rem;
    width: 0.625rem;

    & > span:first-child {
        position: absolute;
        display: inline-flex;
        height: 100%;
        width: 100%;
        border-radius: 50%;
        background: ${({ theme }) => theme.colors.secondary};
        opacity: 0.75;
        animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
    }

    & > span:last-child {
        position: relative;
        display: inline-flex;
        border-radius: 50%;
        height: 0.625rem;
        width: 0.625rem;
        background: ${({ theme }) => theme.colors.secondary};
    }
`;

const TopRightActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const HeaderActionButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    color: ${({ theme }) => theme.colors.textPrimary};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
    }

    &.primary {
        background: ${({ theme }) => theme.colors.primary};
        color: #ffffff;
        border: none;
        box-shadow: 0 1px 2px 0 rgba(255, 87, 51, 0.2);

        &:hover {
            opacity: 0.95;
        }
    }
`;

const TopIconButton = styled.button`
    padding: 0.5rem;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

// Metrics Ribbon
const MetricsRibbon = styled.section`
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.lg} 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;

    ${media.tablet} {
        grid-template-columns: repeat(3, 1fr);
    }

    ${media.desktop} {
        grid-template-columns: repeat(5, 1fr);
    }
`;

const MetricCard = styled.div<{ $variant?: 'warning' | 'error' }>`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 1px solid
        ${({ $variant, theme }) =>
            $variant === 'warning'
                ? '#fde68a'
                : $variant === 'error'
                  ? '#fecaca'
                  : theme.colors.surfaceContainerHighest};
    padding: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
`;

const MetricTopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const MetricLabel = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 600;
`;

const MetricIconBox = styled.div<{ $bg: string; $color: string }>`
    padding: 0.375rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const MetricValue = styled.div<{ $color?: string }>`
    ${({ theme }) => typeScale(theme.typography.headlineMd)}
    color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
    font-weight: 800;
    letter-spacing: -0.01em;
`;

const MetricSub = styled.p<{ $color?: string }>`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ $color, theme }) => $color || theme.colors.textMuted};
    margin-top: 0.25rem;
`;

// Main Workspace (Bento 2-Col)
const Workspace = styled.main`
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    padding: ${({ theme }) => theme.spacing.lg};
    display: grid;
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.lg};
    align-items: start;
    margin-bottom: 3rem;

    ${media.desktop} {
        grid-template-columns: minmax(0, 9fr) minmax(0, 3fr);
    }
`;

const MainContent = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
`;

const AsideContent = styled.aside`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
`;

// Filter Controls Container
const FilterCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1rem;
    padding: 1rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const SearchRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const SearchInputWrap = styled.div`
    position: relative;
    flex: 1;

    & > span {
        position: absolute;
        left: 0.75rem;
        top: 0.625rem;
        color: ${({ theme }) => theme.colors.textMuted};
        font-size: 1.25rem;
    }

    & > input {
        width: 100%;
        padding: 0.5rem 1rem 0.5rem 2.5rem;
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
        border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        border-radius: ${({ theme }) => theme.radii.xl};
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textPrimary};

        &:focus {
            outline: none;
            border-color: ${({ theme }) => theme.colors.primary};
        }
    }
`;

const ToolActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const ToolButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
    }
`;

// Aisle Tabs
const AisleTabsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHigh};
    padding-top: 0.5rem;
`;

const AisleTab = styled.button<{ $active?: boolean }>`
    white-space: nowrap;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    border: none;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    background: ${({ $active, theme }) =>
        $active ? theme.colors.textPrimary : theme.colors.surfaceContainerLow};
    color: ${({ $active, theme }) =>
        $active ? theme.colors.surfaceContainerLowest : theme.colors.textSecondary};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ $active, theme }) =>
            $active ? theme.colors.textPrimary : theme.colors.surfaceContainer};
    }
`;

// Status filter row
const StatusFilterRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 0.25rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHigh};
`;

const LiveSyncNote = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

// Items List
const List = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const RowCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    transition: all 0.15s ease;

    &:hover {
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
    }
`;

const ProductInfoCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 14rem;
`;

const ProductIconThumb = styled.div`
    width: 3rem;
    height: 3rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.textMuted};
    flex-shrink: 0;
`;

const ProductNameText = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
`;

const ProductMetaText = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
    margin-top: 0.125rem;
`;

const BadgeCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.375rem;
`;

const ShelfTag = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textPrimary};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 600;
`;

const RowRightActions = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
`;

const PriceCluster = styled.div`
    text-align: right;
`;

const PriceMain = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 800;
`;

const PriceMrp = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
    text-decoration: line-through;
`;

const StockAmountBadge = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
`;

const ToggleContainer = styled.label`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: pointer;
`;

// Aside Panels (Fast Restock & Dispatch SLA)
const FastRestockCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid #fde68a;
    border-radius: 1rem;
    padding: 1rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
`;

const FastRestockHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const FastRestockTitle = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
    letter-spacing: -0.01em;
`;

const RestockItem = styled.div`
    padding: 0.625rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: rgba(244, 242, 253, 0.4);
    margin-top: 0.75rem;
`;

const RestockItemTitleRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
`;

const RestockBtnRow = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
`;

const DispatchSlaCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1rem;
    padding: 1rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
`;

// Helper for numbers
function num(value: string | number | null | undefined): number {
    return value === null || value === undefined ? 0 : Number(value);
}

function stockState(listing: StoreListing): StockState {
    const onHand = num(listing.inventory?.on_hand_quantity);
    const threshold = num(listing.inventory?.low_stock_threshold);
    if (!listing.is_available || onHand <= 0) return 'OUT_OF_STOCK';
    if (threshold > 0 && onHand <= threshold) return 'LOW_STOCK';
    return 'IN_STOCK';
}

function stockBadge(state: StockState) {
    if (state === 'OUT_OF_STOCK') return <Badge $tone="error">Out of stock</Badge>;
    if (state === 'LOW_STOCK') return <Badge $tone="warning">Low stock</Badge>;
    return <Badge $tone="success">In stock</Badge>;
}

// ==================== MAIN COMPONENT ====================

export function MerchantInventoryPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
    const [activeAisle, setActiveAisle] = useState('All');

    const stores = useQuery({
        queryKey: ['merchant-stores'],
        queryFn: () => apiClient.listOwnStores({ page: 1, limit: 20 }),
    });
    const storeId = stores.data?.data[0]?.id;

    const listings = useQuery({
        queryKey: ['merchant-listings', storeId],
        queryFn: () => apiClient.listOwnListings(storeId!, { page: 1, limit: 100 }),
        enabled: !!storeId,
    });

    const filtered = useMemo(() => {
        const all = listings.data?.data ?? [];
        const term = search.trim().toLowerCase();
        return all.filter((listing) => {
            if (statusFilter !== 'ALL' && stockState(listing) !== statusFilter) return false;
            if (!term) return true;
            const haystack = [
                listing.variant?.product?.name,
                listing.variant?.variant_name,
                listing.variant?.sku,
                listing.variant?.product?.brand,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(term);
        });
    }, [listings.data, search, statusFilter]);

    const stats = useMemo(() => {
        const all = listings.data?.data ?? [];
        const onThisPage = all.length === (listings.data?.meta.total ?? 0);
        return {
            total: listings.data?.meta.total ?? 0,
            inStock: onThisPage ? all.filter((l) => stockState(l) === 'IN_STOCK').length : null,
            lowStock: onThisPage ? all.filter((l) => stockState(l) === 'LOW_STOCK').length : null,
            outOfStock: onThisPage
                ? all.filter((l) => stockState(l) === 'OUT_OF_STOCK').length
                : null,
        };
    }, [listings.data]);

    const toggleAvailability = useMutation({
        mutationFn: (args: { listingId: string; isAvailable: boolean }) =>
            apiClient.updateListing(storeId!, args.listingId, { isAvailable: args.isAvailable }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['merchant-listings', storeId] }),
    });

    if (stores.isLoading) {
        return (
            <PageContainer>
                <LoadingState label="Loading your store..." />
            </PageContainer>
        );
    }
    if (!storeId) {
        return (
            <PageContainer>
                <EmptyState title="No store yet" description="You don't have a store to manage." />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            {/* Top Navigation Bar */}
            <TopBar>
                <TopBarInner>
                    <BrandCluster>
                        <StorefrontIconBox>
                            <span className="material-symbols-outlined" aria-hidden="true">
                                storefront
                            </span>
                        </StorefrontIconBox>
                        <BrandTitles>
                            <BrandTitleRow>
                                <BrandHeading>Dropzo Merchant</BrandHeading>
                                <VersionTag>v2.4 Live</VersionTag>
                            </BrandTitleRow>
                            <HubLocationSubtitle>
                                <strong>Maa Tara Groceries</strong>
                                <span>•</span>
                                <span>Station Road, Badarpur Hub</span>
                            </HubLocationSubtitle>
                        </BrandTitles>
                    </BrandCluster>

                    {/* Operational Live Status */}
                    <TopCenterStatus>
                        <AcceptingOrdersBadge>
                            <LivePulseDot>
                                <span />
                                <span />
                            </LivePulseDot>
                            <span>Accepting Orders (Live)</span>
                        </AcceptingOrdersBadge>
                    </TopCenterStatus>

                    {/* Quick Action Cluster */}
                    <TopRightActions>
                        <HeaderActionButton title="View Stock Activity">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                history
                            </span>
                            <span>Stock Logs</span>
                        </HeaderActionButton>
                        <HeaderActionButton className="primary" title="Add New Product">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                add
                            </span>
                            <span>New Item</span>
                        </HeaderActionButton>
                        <TopIconButton title="Audio Alerts">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '20px' }}
                            >
                                volume_up
                            </span>
                        </TopIconButton>
                        <TopIconButton title="Account Profile">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '24px' }}
                            >
                                account_circle
                            </span>
                        </TopIconButton>
                    </TopRightActions>
                </TopBarInner>
            </TopBar>

            {/* Bento Metrics Ribbon (5 Cards) */}
            <MetricsRibbon>
                {/* Metric 1: Total Listed */}
                <MetricCard>
                    <MetricTopRow>
                        <MetricLabel>Total listed</MetricLabel>
                        <MetricIconBox $bg="#eeedf7" $color="#1a1b22">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                inventory_2
                            </span>
                        </MetricIconBox>
                    </MetricTopRow>
                    <MetricValue>{stats.total}</MetricValue>
                    <MetricSub $color="#006e2d">+4 added this week</MetricSub>
                </MetricCard>

                {/* Metric 2: In stock */}
                <MetricCard>
                    <MetricTopRow>
                        <MetricLabel>In stock</MetricLabel>
                        <MetricIconBox $bg="rgba(124, 249, 148, 0.4)" $color="#006e2d">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                check_circle
                            </span>
                        </MetricIconBox>
                    </MetricTopRow>
                    <MetricValue>{stats.inStock ?? '—'}</MetricValue>
                    <MetricSub>Live on customer app</MetricSub>
                </MetricCard>

                {/* Metric 3: Low stock */}
                <MetricCard $variant="warning">
                    <MetricTopRow>
                        <MetricLabel style={{ color: '#92400e' }}>Low stock</MetricLabel>
                        <MetricIconBox $bg="#fef3c7" $color="#b45309">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                warning
                            </span>
                        </MetricIconBox>
                    </MetricTopRow>
                    <MetricValue $color="#78350f">{stats.lowStock ?? '—'}</MetricValue>
                    <MetricSub $color="#92400e">High depletion risk</MetricSub>
                </MetricCard>

                {/* Metric 4: Out of stock */}
                <MetricCard $variant="error">
                    <MetricTopRow>
                        <MetricLabel style={{ color: '#b91c1c' }}>Out of stock</MetricLabel>
                        <MetricIconBox $bg="#fee2e2" $color="#b91c1c">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                block
                            </span>
                        </MetricIconBox>
                    </MetricTopRow>
                    <MetricValue $color="#991b1b">{stats.outOfStock ?? '—'}</MetricValue>
                    <MetricSub $color="#b91c1c">Auto-suppressed</MetricSub>
                </MetricCard>

                {/* Metric 5: Valuation */}
                <MetricCard>
                    <MetricTopRow>
                        <MetricLabel>Inventory Value</MetricLabel>
                        <MetricIconBox $bg="#e8e7f1" $color="#ff5733">
                            <span
                                className="material-symbols-outlined"
                                aria-hidden="true"
                                style={{ fontSize: '18px' }}
                            >
                                currency_rupee
                            </span>
                        </MetricIconBox>
                    </MetricTopRow>
                    <MetricValue>₹1,48,250</MetricValue>
                    <MetricSub>At wholesale cost</MetricSub>
                </MetricCard>
            </MetricsRibbon>

            {/* Main Workspace (Bento 2-Col Layout) */}
            <Workspace>
                {/* Left 9-Cols: Filters & Items Table */}
                <MainContent>
                    <FilterCard>
                        {/* Search & Tool Buttons */}
                        <SearchRow>
                            <SearchInputWrap>
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    manage_search
                                </span>
                                <input
                                    placeholder="Search product, barcode or SKU..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search listings"
                                />
                            </SearchInputWrap>
                            <ToolActions>
                                <ToolButton title="Scan Barcode">
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '18px' }}
                                    >
                                        barcode_scanner
                                    </span>
                                    <span>Scan</span>
                                </ToolButton>
                                <ToolButton title="Bulk Update">
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '18px' }}
                                    >
                                        edit_note
                                    </span>
                                    <span>Bulk</span>
                                </ToolButton>
                                <ToolButton title="Export CSV">
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '18px' }}
                                    >
                                        download
                                    </span>
                                    <span>Export</span>
                                </ToolButton>
                            </ToolActions>
                        </SearchRow>

                        {/* Aisle / Category Pills */}
                        <AisleTabsRow>
                            {[
                                'All',
                                'Atta & Grains',
                                'Dairy & Chilled',
                                'Edible Oils',
                                'Spices',
                                'Biscuits & Snacks',
                                'Barak Valley Exclusives',
                            ].map((aisle) => (
                                <AisleTab
                                    key={aisle}
                                    $active={activeAisle === aisle}
                                    onClick={() => setActiveAisle(aisle)}
                                >
                                    {aisle}
                                </AisleTab>
                            ))}
                        </AisleTabsRow>

                        {/* Status Filter Row */}
                        <StatusFilterRow>
                            <SegmentedControl
                                aria-label="Filter by stock status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: 'ALL', label: 'All' },
                                    { value: 'IN_STOCK', label: 'In stock' },
                                    { value: 'LOW_STOCK', label: 'Low stock' },
                                    { value: 'OUT_OF_STOCK', label: 'Out of stock' },
                                ]}
                            />
                            <LiveSyncNote>
                                <span
                                    className="material-symbols-outlined"
                                    aria-hidden="true"
                                    style={{ fontSize: '16px', color: '#006e2d' }}
                                >
                                    sync
                                </span>
                                <span>Live sync • Auto-depletes on customer checkout</span>
                            </LiveSyncNote>
                        </StatusFilterRow>
                    </FilterCard>

                    {/* Listings Stack */}
                    {listings.isLoading && (
                        <List>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} $height="5rem" />
                            ))}
                        </List>
                    )}
                    {listings.isError && (
                        <ErrorState description="Could not load your inventory." />
                    )}
                    {listings.data && filtered.length === 0 && (
                        <EmptyState
                            title="No matching listings"
                            description="Try a different search or filter."
                        />
                    )}
                    {listings.data && filtered.length > 0 && (
                        <List>
                            {filtered.map((listing, index) => {
                                const state = stockState(listing);
                                const onHand = num(listing.inventory?.on_hand_quantity);
                                return (
                                    <RowCard key={listing.id}>
                                        <ProductInfoCluster>
                                            <ProductIconThumb>
                                                <span
                                                    className="material-symbols-outlined"
                                                    aria-hidden="true"
                                                    style={{ fontSize: '24px' }}
                                                >
                                                    inventory_2
                                                </span>
                                            </ProductIconThumb>
                                            <div>
                                                <ProductNameText>
                                                    {listing.variant?.product?.name ??
                                                        'Unknown product'}
                                                </ProductNameText>
                                                <ProductMetaText>
                                                    {listing.variant?.variant_name} ·{' '}
                                                    {listing.variant?.unit}
                                                    {listing.variant?.sku
                                                        ? ` · SKU ${listing.variant.sku}`
                                                        : ''}
                                                </ProductMetaText>
                                                <BadgeCluster>
                                                    {stockBadge(state)}
                                                    <ShelfTag>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            aria-hidden="true"
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            grid_view
                                                        </span>
                                                        <span>
                                                            Shelf #
                                                            {String.fromCharCode(65 + (index % 4))}
                                                            -0{index + 1}
                                                        </span>
                                                    </ShelfTag>
                                                </BadgeCluster>
                                            </div>
                                        </ProductInfoCluster>

                                        <RowRightActions>
                                            <PriceCluster>
                                                <PriceMain>₹{listing.selling_price}</PriceMain>
                                                {listing.mrp && (
                                                    <PriceMrp>MRP: ₹{listing.mrp}</PriceMrp>
                                                )}
                                            </PriceCluster>

                                            <StockAmountBadge>
                                                <span
                                                    style={{
                                                        fontWeight: 800,
                                                        fontSize: '1.125rem',
                                                    }}
                                                >
                                                    {onHand}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.6875rem',
                                                        color: '#71717a',
                                                    }}
                                                >
                                                    units on hand
                                                </span>
                                            </StockAmountBadge>

                                            <ToggleContainer>
                                                <span>Active</span>
                                                <Switch
                                                    checked={listing.is_available}
                                                    aria-label={`Toggle availability for ${listing.variant?.product?.name ?? 'listing'}`}
                                                    disabled={toggleAvailability.isPending}
                                                    onChange={(checked) =>
                                                        toggleAvailability.mutate({
                                                            listingId: listing.id,
                                                            isAvailable: checked,
                                                        })
                                                    }
                                                />
                                            </ToggleContainer>

                                            <Button
                                                $variant="secondary"
                                                $size="sm"
                                                onClick={() => setSelectedListingId(listing.id)}
                                            >
                                                Manage stock
                                            </Button>
                                        </RowRightActions>
                                    </RowCard>
                                );
                            })}
                        </List>
                    )}
                </MainContent>

                {/* Right 3-Cols Aside Panel */}
                <AsideContent>
                    {/* Fast-Restock Recommendations */}
                    <FastRestockCard>
                        <FastRestockHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                    className="material-symbols-outlined"
                                    aria-hidden="true"
                                    style={{ color: '#b45309', fontSize: '20px' }}
                                >
                                    bolt
                                </span>
                                <FastRestockTitle>Fast-Restock</FastRestockTitle>
                            </div>
                            <span
                                style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '9999px',
                                    background: '#fef3c7',
                                    color: '#92400e',
                                }}
                            >
                                8 Alerts
                            </span>
                        </FastRestockHeader>

                        <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.5rem' }}>
                            High velocity staples near stock-out at Badarpur Hub. 1-tap re-stock
                            triggers partner dispatch:
                        </p>

                        <RestockItem>
                            <RestockItemTitleRow>
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                    Fortune Sunlite Oil (1L)
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        padding: '0.05rem 0.375rem',
                                        borderRadius: '4px',
                                    }}
                                >
                                    3 left
                                </span>
                            </RestockItemTitleRow>
                            <p style={{ fontSize: '0.6875rem', color: '#71717a' }}>
                                Avg run-rate: 14 pouches/day
                            </p>
                            <RestockBtnRow>
                                <Button $variant="secondary" $size="sm" style={{ flex: 1 }}>
                                    +10 units
                                </Button>
                                <Button $variant="primary" $size="sm" style={{ flex: 1 }}>
                                    Re-order
                                </Button>
                            </RestockBtnRow>
                        </RestockItem>

                        <RestockItem>
                            <RestockItemTitleRow>
                                <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                                    Amul Taaza Milk (500ml)
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        background: '#fef3c7',
                                        color: '#b45309',
                                        padding: '0.05rem 0.375rem',
                                        borderRadius: '4px',
                                    }}
                                >
                                    2 crates left
                                </span>
                            </RestockItemTitleRow>
                            <p style={{ fontSize: '0.6875rem', color: '#71717a' }}>
                                Chiller bin #C-02 • Peak demand
                            </p>
                            <RestockBtnRow>
                                <Button $variant="secondary" $size="sm" style={{ flex: 1 }}>
                                    +24 pouches
                                </Button>
                                <Button $variant="primary" $size="sm" style={{ flex: 1 }}>
                                    Confirm
                                </Button>
                            </RestockBtnRow>
                        </RestockItem>
                    </FastRestockCard>

                    {/* Hub Dispatch SLA Card */}
                    <DispatchSlaCard>
                        <h4
                            style={{
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Hub Dispatch SLA
                        </h4>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8125rem',
                            }}
                        >
                            <span style={{ color: '#71717a' }}>On-time fulfillment</span>
                            <strong style={{ color: '#006e2d' }}>99.2%</strong>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8125rem',
                                marginTop: '0.25rem',
                            }}
                        >
                            <span style={{ color: '#71717a' }}>Avg dispatch time</span>
                            <strong>4.2 mins</strong>
                        </div>
                    </DispatchSlaCard>
                </AsideContent>
            </Workspace>

            {/* Modal for detailed stock actions */}
            {selectedListingId && storeId && (
                <ListingDetailModal
                    storeId={storeId}
                    listingId={selectedListingId}
                    onClose={() => setSelectedListingId(null)}
                />
            )}

            {/* Quick Barcode Scan Floating Action Bar (Mobile) */}
            <FloatingBarcodeDock>
                <FloatingBarcodePill
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        const input = document.querySelector(
                            'input[placeholder*="Search"]',
                        ) as HTMLInputElement;
                        if (input) input.focus();
                    }}
                >
                    <BarcodeIconBadge>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            qr_code_scanner
                        </span>
                    </BarcodeIconBadge>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>
                        Scan Barcode to Adjust Stock
                    </span>
                    <span
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            padding: '0.125rem 0.375rem',
                            borderRadius: '9999px',
                        }}
                    >
                        F2 / Camera
                    </span>
                </FloatingBarcodePill>
            </FloatingBarcodeDock>

            {/* Mobile Bottom Navigation */}
            <MobileNav>
                <MobileNavItem to="/merchant/orders">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        receipt_long
                    </span>
                    <span>Orders</span>
                </MobileNavItem>

                <MobileNavItem to="/merchant/inventory" $active>
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
        </PageContainer>
    );
}

// Modal Component for Stock Management
function ListingDetailModal({
    storeId,
    listingId,
    onClose,
}: {
    storeId: string;
    listingId: string;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const [receiveQty, setReceiveQty] = useState('');
    const [receiveBatchCode, setReceiveBatchCode] = useState('');
    const [receiveExpiry, setReceiveExpiry] = useState('');
    const [adjustDelta, setAdjustDelta] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [removeType, setRemoveType] = useState<'DAMAGED' | 'EXPIRED'>('DAMAGED');
    const [removeQty, setRemoveQty] = useState('');
    const [removeReason, setRemoveReason] = useState('');
    const [thresholdInput, setThresholdInput] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    const listing = useQuery({
        queryKey: ['merchant-listing', storeId, listingId],
        queryFn: () => apiClient.getOwnListing(storeId, listingId),
    });

    const movements = useQuery({
        queryKey: ['merchant-listing-movements', storeId, listingId],
        queryFn: () => apiClient.listStockMovements(storeId, listingId, { page: 1, limit: 10 }),
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['merchant-listing', storeId, listingId] });
        queryClient.invalidateQueries({ queryKey: ['merchant-listings', storeId] });
        queryClient.invalidateQueries({
            queryKey: ['merchant-listing-movements', storeId, listingId],
        });
    }

    const receiveStock = useMutation({
        mutationFn: () =>
            apiClient.receiveStock(storeId, listingId, {
                quantity: Number(receiveQty),
                batchCode: receiveBatchCode || undefined,
                expiryDate: receiveExpiry ? new Date(receiveExpiry).toISOString() : undefined,
            }),
        onSuccess: () => {
            setReceiveQty('');
            setReceiveBatchCode('');
            setReceiveExpiry('');
            setActionError(null);
            invalidate();
        },
        onError: (e) =>
            setActionError(e instanceof ApiError ? e.message : 'Failed to receive stock.'),
    });

    const adjustStock = useMutation({
        mutationFn: () =>
            apiClient.adjustStock(storeId, listingId, {
                quantityDelta: Number(adjustDelta),
                reason: adjustReason,
            }),
        onSuccess: () => {
            setAdjustDelta('');
            setAdjustReason('');
            setActionError(null);
            invalidate();
        },
        onError: (e) =>
            setActionError(e instanceof ApiError ? e.message : 'Failed to adjust stock.'),
    });

    const removeStock = useMutation({
        mutationFn: () =>
            apiClient.removeStock(storeId, listingId, {
                quantity: Number(removeQty),
                type: removeType,
                reason: removeReason,
            }),
        onSuccess: () => {
            setRemoveQty('');
            setRemoveReason('');
            setActionError(null);
            invalidate();
        },
        onError: (e) =>
            setActionError(e instanceof ApiError ? e.message : 'Failed to remove stock.'),
    });

    const updateThreshold = useMutation({
        mutationFn: () =>
            apiClient.updateListing(storeId, listingId, {
                lowStockThreshold: Number(thresholdInput),
            }),
        onSuccess: () => {
            setThresholdInput('');
            setActionError(null);
            invalidate();
        },
        onError: (e) =>
            setActionError(e instanceof ApiError ? e.message : 'Failed to update threshold.'),
    });

    const data = listing.data;
    const inv = data?.inventory;
    const batches = inv?.stock_batches ?? [];

    return (
        <Modal open={true} onClose={onClose} title={data?.variant?.product?.name ?? 'Manage stock'}>
            {listing.isLoading && <LoadingState label="Loading listing details" />}
            {listing.isError && <ErrorState description="Could not load listing details." />}
            {data && (
                <div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                        }}
                    >
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>On hand</span>
                            <strong style={{ display: 'block', fontSize: '1.25rem' }}>
                                {num(inv?.on_hand_quantity)}
                            </strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Reserved</span>
                            <strong style={{ display: 'block', fontSize: '1.25rem' }}>
                                {num(inv?.reserved_quantity)}
                            </strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Available</span>
                            <strong style={{ display: 'block', fontSize: '1.25rem' }}>
                                {Math.max(
                                    0,
                                    num(inv?.on_hand_quantity) - num(inv?.reserved_quantity),
                                )}
                            </strong>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                                Low-stock alert at
                            </span>
                            <strong style={{ display: 'block', fontSize: '1.25rem' }}>
                                {num(inv?.low_stock_threshold)}
                            </strong>
                        </div>
                    </div>

                    {actionError && <ErrorState description={actionError} />}

                    {/* Receive Stock Section */}
                    <div
                        style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #e3e1ec',
                        }}
                    >
                        <h4
                            style={{
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Receive Stock
                        </h4>
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                            }}
                        >
                            <Input
                                id="receive-qty"
                                label="Quantity"
                                type="number"
                                placeholder="e.g. 20"
                                value={receiveQty}
                                onChange={(e) => setReceiveQty(e.target.value)}
                            />
                            {data.uses_batch_tracking && (
                                <>
                                    <Input
                                        id="receive-batch"
                                        label="Batch code"
                                        placeholder="BATCH-001"
                                        value={receiveBatchCode}
                                        onChange={(e) => setReceiveBatchCode(e.target.value)}
                                    />
                                    <Input
                                        id="receive-expiry"
                                        label="Expiry date"
                                        type="date"
                                        value={receiveExpiry}
                                        onChange={(e) => setReceiveExpiry(e.target.value)}
                                    />
                                </>
                            )}
                            <Button
                                disabled={
                                    !receiveQty || Number(receiveQty) <= 0 || receiveStock.isPending
                                }
                                onClick={() => receiveStock.mutate()}
                            >
                                Receive
                            </Button>
                        </div>
                    </div>

                    {/* Adjust Stock Section */}
                    <div
                        style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #e3e1ec',
                        }}
                    >
                        <h4
                            style={{
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Adjust Stock
                        </h4>
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                            }}
                        >
                            <Input
                                id="adjust-delta"
                                label="Delta (+/-)"
                                type="number"
                                placeholder="-2 or +5"
                                value={adjustDelta}
                                onChange={(e) => setAdjustDelta(e.target.value)}
                            />
                            <Input
                                id="adjust-reason"
                                label="Reason"
                                placeholder="Audit count mismatch"
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                            />
                            <Button
                                disabled={!adjustDelta || !adjustReason || adjustStock.isPending}
                                onClick={() => adjustStock.mutate()}
                            >
                                Adjust
                            </Button>
                        </div>
                    </div>

                    {/* Remove Stock Section */}
                    <div
                        style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #e3e1ec',
                        }}
                    >
                        <h4
                            style={{
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Remove Damaged or Expired
                        </h4>
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                alignItems: 'flex-end',
                            }}
                        >
                            <select
                                value={removeType}
                                onChange={(e) =>
                                    setRemoveType(e.target.value as 'DAMAGED' | 'EXPIRED')
                                }
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid #8f7069',
                                }}
                            >
                                <option value="DAMAGED">Damaged</option>
                                <option value="EXPIRED">Expired</option>
                            </select>
                            <Input
                                id="remove-qty"
                                label="Quantity"
                                type="number"
                                placeholder="1"
                                value={removeQty}
                                onChange={(e) => setRemoveQty(e.target.value)}
                            />
                            <Input
                                id="remove-reason"
                                label="Reason"
                                placeholder="Broken seal"
                                value={removeReason}
                                onChange={(e) => setRemoveReason(e.target.value)}
                            />
                            <Button
                                $variant="secondary"
                                disabled={
                                    !removeQty || Number(removeQty) <= 0 || removeStock.isPending
                                }
                                onClick={() => removeStock.mutate()}
                            >
                                Remove
                            </Button>
                        </div>
                    </div>

                    {/* Low Stock Alert Threshold */}
                    <div
                        style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #e3e1ec',
                        }}
                    >
                        <h4
                            style={{
                                fontSize: '0.9375rem',
                                fontWeight: 700,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Low-Stock Threshold
                        </h4>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <Input
                                id="threshold-input"
                                label="Alert when stock falls below"
                                type="number"
                                placeholder={String(inv?.low_stock_threshold ?? 5)}
                                value={thresholdInput}
                                onChange={(e) => setThresholdInput(e.target.value)}
                            />
                            <Button
                                disabled={!thresholdInput || updateThreshold.isPending}
                                onClick={() => updateThreshold.mutate()}
                            >
                                Save threshold
                            </Button>
                        </div>
                    </div>

                    {/* Batches view if tracking enabled */}
                    {data.uses_batch_tracking && batches.length > 0 && (
                        <div
                            style={{
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid #e3e1ec',
                            }}
                        >
                            <h4
                                style={{
                                    fontSize: '0.9375rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Active Batches (FEFO order)
                            </h4>
                            {batches.map((b) => (
                                <div
                                    key={b.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.8125rem',
                                        padding: '0.25rem 0',
                                    }}
                                >
                                    <span>
                                        {b.batch_code ?? 'Batch'} (Qty: {b.on_hand_quantity})
                                    </span>
                                    <span>
                                        Exp:{' '}
                                        {b.expiry_date
                                            ? new Date(b.expiry_date).toLocaleDateString()
                                            : 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stock Movements Log */}
                    {movements.data && movements.data.data.length > 0 && (
                        <div
                            style={{
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid #e3e1ec',
                            }}
                        >
                            <h4
                                style={{
                                    fontSize: '0.9375rem',
                                    fontWeight: 700,
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Recent Stock Movements
                            </h4>
                            {movements.data.data.map((m) => (
                                <div
                                    key={m.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.8125rem',
                                        padding: '0.25rem 0',
                                        color: '#71717a',
                                    }}
                                >
                                    <span>
                                        {m.movement_type} ({m.quantity})
                                    </span>
                                    <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
