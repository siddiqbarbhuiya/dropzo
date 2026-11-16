import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { media } from '../../theme';

// ==================== TYPES & INTERFACES ====================

type DateRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH';

interface HourlyVelocity {
    hour: string;
    label: string;
    pickupHeight: number;
    deliveryHeight: number;
    amount: string;
    isPeak?: boolean;
    isLive?: boolean;
}

interface SkuVelocityItem {
    rank: number;
    name: string;
    packSize: string;
    category: string;
    healthTag: string;
    units: number;
    revenue: string;
    isSpecial?: boolean;
}

// ==================== MOCK DATA (TODO: WIRE TO API) ====================

const HOURLY_VELOCITY_DATA: HourlyVelocity[] = [
    { hour: '7 AM', label: '7 AM', pickupHeight: 18, deliveryHeight: 0, amount: '₹210' },
    { hour: '8 AM', label: '8 AM', pickupHeight: 52, deliveryHeight: 24, amount: '₹680' },
    { hour: '9 AM', label: '9 AM', pickupHeight: 72, deliveryHeight: 38, amount: '₹940' },
    { hour: '10 AM', label: '10 AM', pickupHeight: 44, deliveryHeight: 18, amount: '₹520' },
    { hour: '11 AM', label: '11 AM', pickupHeight: 34, deliveryHeight: 0, amount: '₹340' },
    { hour: '12 PM', label: '12 PM', pickupHeight: 20, deliveryHeight: 0, amount: '₹190' },
    { hour: '1 PM', label: '1 PM', pickupHeight: 0, deliveryHeight: 14, amount: '₹120' },
    { hour: '2 PM', label: '2 PM', pickupHeight: 12, deliveryHeight: 0, amount: '₹90' },
    { hour: '3 PM', label: '3 PM', pickupHeight: 22, deliveryHeight: 0, amount: '₹180' },
    { hour: '4 PM', label: '4 PM', pickupHeight: 24, deliveryHeight: 16, amount: '₹320' },
    { hour: '5 PM', label: '5 PM', pickupHeight: 60, deliveryHeight: 30, amount: '₹780' },
    {
        hour: '6 PM',
        label: '6 PM',
        pickupHeight: 98,
        deliveryHeight: 42,
        amount: '₹1,120',
        isPeak: true,
    },
    {
        hour: '7 PM',
        label: '7 PM',
        pickupHeight: 38,
        deliveryHeight: 14,
        amount: '₹320',
        isLive: true,
    },
];

const TOP_SKUS_DATA: SkuVelocityItem[] = [
    {
        rank: 1,
        name: 'Fortune Sunlite Sunflower Oil (1L)',
        packSize: '1L Pouch',
        category: 'Edible Oils',
        healthTag: '98% Stock Health (42 left)',
        units: 18,
        revenue: '₹2,610',
    },
    {
        rank: 2,
        name: 'India Gate Basmati Rice (1kg)',
        packSize: '1 kg Bag',
        category: 'Grains & Staples',
        healthTag: 'Daily Household Velocity',
        units: 14,
        revenue: '₹1,540',
    },
    {
        rank: 3,
        name: 'Assam Valley CTC Tea (250g)',
        packSize: '500g',
        category: 'Tea & Beverages',
        healthTag: 'High Margin',
        units: 12,
        revenue: '₹1,920',
    },
    {
        rank: 4,
        name: 'Amul Butter (500g)',
        packSize: 'Cold Chain',
        category: 'Dairy & Breakfast',
        healthTag: 'Refrigerator Bay B',
        units: 9,
        revenue: '₹2,475',
    },
    {
        rank: 5,
        name: 'Fresh Kazi Nemu (Barak Special)',
        packSize: 'Farm Fresh',
        category: 'Barak Specials',
        healthTag: 'Fast depletion • Only 4 packs remaining',
        units: 24,
        revenue: '₹960',
        isSpecial: true,
    },
];

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    flex-direction: column;
    padding-bottom: 6rem;

    ${media.desktop} {
        padding-bottom: 3rem;
    }
`;

const TopBar = styled.header`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
    position: sticky;
    top: 0;
    z-index: 40;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;

const TopBarInner = styled.div`
    max-width: 1400px;
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
    border-radius: 0.75rem;
    background-color: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(255, 87, 51, 0.3);
`;

const BrandTextCluster = styled.div`
    display: flex;
    flex-direction: column;
`;

const BrandTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const BrandTitle = styled.span`
    font-size: 1.125rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.02em;
`;

const HubPill = styled.span`
    background-color: #dcfce7;
    color: #006e2d;
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    gap: 0.375rem;
`;

const PulseDot = styled.span`
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 9999px;
    background-color: #006e2d;
    animation: pulse 1.5s infinite;

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.4;
        }
    }
`;

const StoreSubtitle = styled.span`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 0.375rem;

    @media (max-width: 640px) {
        display: none;
    }
`;

const CenterNav = styled.nav`
    display: none;

    ${media.desktop} {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
        padding: 0.25rem;
        border-radius: 9999px;
        border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    }
`;

const NavTab = styled(Link)<{ $active?: boolean }>`
    padding: 0.25rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: ${({ $active }) => ($active ? '800' : '600')};
    text-decoration: none;
    transition: all 0.15s ease;
    background-color: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
    box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none')};

    &:hover {
        color: ${({ $active }) => ($active ? '#ffffff' : '#1e293b')};
    }
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const RoundButton = styled.button`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
    }

    &:active {
        transform: scale(0.95);
    }
`;

const AlertDot = styled.span`
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.primary};
    border: 1.5px solid #ffffff;
`;

const ProfileChip = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.625rem 0.25rem 0.25rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const MainContent = styled.main`
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    padding: 1.25rem 1rem 2rem;

    ${media.desktop} {
        padding: 1.75rem 1.5rem 3rem;
    }
`;

// Subheader Section
const DashboardHeader = styled.section`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};

    ${media.desktop} {
        flex-direction: row;
        align-items: center;
    }
`;

const HeaderTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
`;

const PageTitle = styled.h1`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.02em;
    margin: 0;
`;

const StatusPill = styled.span`
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 700;
    background-color: #dcfce7;
    color: #006e2d;
    border: 1px solid rgba(0, 110, 45, 0.2);
`;

const PageDescription = styled.p`
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-top: 0.25rem;
    margin-bottom: 0;
`;

const FilterControlsCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-wrap: wrap;
    width: 100%;

    ${media.desktop} {
        width: auto;
    }
`;

const DateSegmentSelector = styled.div`
    display: flex;
    align-items: center;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 0.25rem;
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`;

const DateSegmentButton = styled.button<{ $active?: boolean }>`
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: ${({ $active }) => ($active ? '700' : '600')};
    background-color: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        color: ${({ $active }) => ($active ? '#ffffff' : '#1e293b')};
    }
`;

const DateDisplayPill = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 0.75rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`;

const ActionButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    }

    &:active {
        transform: scale(0.97);
    }
`;

// 5 KPI Metrics Tiles
const KpiGrid = styled.section`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;
    margin-bottom: 1.5rem;

    ${media.tablet} {
        grid-template-columns: repeat(2, 1fr);
    }

    ${media.desktop} {
        grid-template-columns: repeat(5, 1fr);
    }
`;

const KpiCard = styled.div<{ $borderAccent?: string }>`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1.125rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    ${({ $borderAccent }) => ($borderAccent ? `border-left: 4px solid ${$borderAccent};` : '')}
`;

const KpiTopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const KpiLabel = styled.span`
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const KpiIconBadge = styled.span<{ $variant?: 'primary' | 'secondary' | 'neutral' }>`
    padding: 0.375rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({ $variant, theme }) =>
        $variant === 'primary'
            ? theme.colors.primaryLight
            : $variant === 'secondary'
              ? '#dcfce7'
              : theme.colors.surfaceContainer};
    color: ${({ $variant, theme }) =>
        $variant === 'primary' ? theme.colors.primary : $variant === 'secondary' ? '#006e2d' : '#64748b'};
`;

const KpiValue = styled.div`
    font-size: 1.625rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    letter-spacing: -0.02em;
    line-height: 1.2;
`;

const KpiFooter = styled.div`
    margin-top: 0.75rem;
    padding-top: 0.625rem;
    border-top: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.6875rem;
`;

const ChannelBarTrack = styled.div`
    width: 100%;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    display: flex;
    overflow: hidden;
    margin-top: 0.5rem;
`;

const ChannelBarSegment = styled.div<{ $width: string; $color: string }>`
    width: ${({ $width }) => $width};
    height: 100%;
    background-color: ${({ $color }) => $color};
`;

// Bento Grid Layout
const BentoGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-bottom: 1.5rem;

    ${media.desktop} {
        grid-template-columns: 8fr 4fr;
    }
`;

const CardContainer = styled.div`
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 1.25rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    ${media.desktop} {
        padding: 1.5rem;
    }
`;

const CardHeaderRow = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
    }
`;

const CardTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
    letter-spacing: -0.01em;
`;

const CardSubtitle = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.125rem 0 0;
`;

// Hourly Bar Chart
const BarChartContainer = styled.div`
    width: 100%;
    padding-top: 1.5rem;
`;

const BarChartGrid = styled.div`
    height: 14rem;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.375rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    padding-bottom: 0.5rem;
    position: relative;
`;

const HourColumn = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    position: relative;
    cursor: pointer;

    &:hover .amount-tooltip {
        opacity: 1;
    }
`;

const BarTooltip = styled.div`
    font-size: 0.625rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
    opacity: 0;
    transition: opacity 0.15s ease;
    white-space: nowrap;
    position: absolute;
    top: -1.25rem;
`;

const PeakTag = styled.div`
    position: absolute;
    top: -2rem;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.625rem;
    font-weight: 800;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    z-index: 10;
`;

const BarStack = styled.div`
    width: 100%;
    max-width: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
`;

const BarPickup = styled.div<{ $height: number; $isPeak?: boolean }>`
    width: 100%;
    height: ${({ $height }) => `${$height}px`};
    background-color: ${({ theme }) => theme.colors.primary};
    border-radius: 2px 2px 0 0;
    ${({ $isPeak }) => ($isPeak ? 'outline: 2px solid #ffdad3;' : '')}
`;

const BarDelivery = styled.div<{ $height: number }>`
    width: 100%;
    height: ${({ $height }) => `${$height}px`};
    background-color: #3298dc;
    border-radius: 2px 2px 0 0;
`;

const HourLabel = styled.span<{ $isBold?: boolean; $isHighlight?: boolean }>`
    font-size: 0.6875rem;
    font-weight: ${({ $isBold }) => ($isBold ? '800' : '500')};
    color: ${({ $isHighlight, theme }) => ($isHighlight ? theme.colors.primary : '#64748b')};
    margin-top: 0.25rem;
`;

const InsightCallout = styled.div`
    margin-top: 1rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

// Funnel Speed Section
const FunnelStageBox = styled.div`
    padding: 0.75rem;
    border-radius: 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    margin-bottom: 0.75rem;
`;

const FunnelStageHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
    font-size: 0.75rem;
    font-weight: 700;
`;

const StageIndicatorDot = styled.span<{ $color: string }>`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: ${({ $color }) => $color};
    display: inline-block;
    margin-right: 0.375rem;
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 0.375rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    border-radius: 9999px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $width: string; $color: string }>`
    width: ${({ $width }) => $width};
    height: 100%;
    background-color: ${({ $color }) => $color};
`;

// Balanced Grid for Leaderboard & Settlement
const BalancedGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-bottom: 1.5rem;

    ${media.desktop} {
        grid-template-columns: 7fr 5fr;
    }
`;

const SkuRow = styled.div<{ $special?: boolean }>`
    padding: 0.75rem 0.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-radius: 0.5rem;
    transition: background-color 0.15s ease;
    ${({ $special }) => ($special ? 'background-color: rgba(255, 218, 214, 0.25);' : '')}

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    }
`;

const SkuRankBadge = styled.div<{ $isTop?: boolean }>`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.625rem;
    background-color: ${({ $isTop, theme }) =>
        $isTop ? theme.colors.primaryLight : theme.colors.surfaceContainerLow};
    color: ${({ $isTop, theme }) => ($isTop ? theme.colors.primary : theme.colors.textPrimary)};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 800;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    flex-shrink: 0;
`;

const SkuInfo = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

const SkuTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
`;

const SkuName = styled.span`
    font-size: 0.8125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const SkuBadge = styled.span`
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
`;

const SkuMeta = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-top: 0.125rem;
`;

const SkuStats = styled.div`
    text-align: right;
    flex-shrink: 0;
`;

const SkuUnits = styled.div`
    font-size: 0.875rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const SkuRevenue = styled.div`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
`;

// Settlement Matrix Card
const SettlementMatrix = styled.div`
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
`;

const SettlementRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SettlementIcon = styled.span<{ $bg: string; $color: string }>`
    padding: 0.375rem;
    border-radius: 0.5rem;
    background-color: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const RealizedEarningsBanner = styled.div`
    padding: 1rem;
    border-radius: 0.75rem;
    background-color: rgba(255, 218, 211, 0.4);
    border: 1px solid rgba(183, 35, 1, 0.2);
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

// Operational Alerts Section
const AlertsGrid = styled.section`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;

    ${media.tablet} {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const AlertCard = styled.div<{ $accentColor: string; $borderAccent?: string }>`
    padding: 1.25rem;
    border-radius: 1rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ $borderAccent, theme }) => $borderAccent ?? theme.colors.borderSubtle};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0.375rem;
        background-color: ${({ $accentColor }) => $accentColor};
    }
`;

const AlertIconBox = styled.div<{ $bg: string; $color: string }>`
    padding: 0.5rem;
    border-radius: 0.75rem;
    background-color: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const AlertBody = styled.div`
    flex: 1;
`;

const AlertTitleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const AlertTitle = styled.h3`
    font-size: 0.875rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
`;

const AlertBadge = styled.span<{ $bg: string; $color: string }>`
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
    background-color: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
`;

const AlertText = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.375rem 0 0.75rem;
    line-height: 1.4;
`;

const AlertActionsCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
    padding: 0.375rem 0.875rem;
    border-radius: 0.5rem;
    background-color: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transition: all 0.15s ease;

    &:hover {
        opacity: 0.9;
    }
`;

const SecondaryButton = styled.button`
    padding: 0.375rem 0.875rem;
    border-radius: 0.5rem;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background-color: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

// Mobile Bottom Navigation Bar
const MobileBottomNav = styled.nav`
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 50;
    background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-top: 1px solid ${({ theme }) => theme.colors.borderSubtle};
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
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
    color: ${({ $active }) => ($active ? '#ffffff' : '#64748b')};
    background-color: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    font-size: 0.6875rem;
    font-weight: 700;
    transition: all 0.15s ease;
`;

// ==================== MAIN COMPONENT ====================

export function MerchantAnalyticsPage(): React.ReactElement {
    const [dateRange, setDateRange] = useState<DateRange>('TODAY');
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Fetch store context
    const storesQuery = useQuery({
        queryKey: ['merchant-own-stores'],
        queryFn: () => apiClient.listOwnStores(),
    });

    const activeStore = storesQuery.data?.data?.[0];
    const storeName = activeStore?.name ?? 'Maa Tara Groceries';

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleExport = () => {
        // Trigger CSV download simulation
        const csvContent = 'data:text/csv;charset=utf-8,Category,Units,Revenue\nEdible Oils,18,2610\nGrains,14,1540\nTea,12,1920\nDairy,9,2475\nSpecials,24,960';
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `dropzo-analytics-${dateRange.toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <PageContainer>
            {/* Top Bar Header */}
            <TopBar>
                <TopBarInner>
                    {/* Brand Cluster */}
                    <BrandCluster>
                        <StorefrontIconBox>
                            <span className="material-symbols-outlined">storefront</span>
                        </StorefrontIconBox>
                        <BrandTextCluster>
                            <BrandTitleRow>
                                <BrandTitle>Dropzo Merchant</BrandTitle>
                                <HubPill>
                                    <PulseDot />
                                    BADARPUR HUB LIVE
                                </HubPill>
                            </BrandTitleRow>
                            <StoreSubtitle>
                                {storeName} • Station Road, Badarpur
                                <span style={{ color: '#94a3b8' }}>• Station ID: BDP-04</span>
                            </StoreSubtitle>
                        </BrandTextCluster>
                    </BrandCluster>

                    {/* Desktop Center Navigation Tabs */}
                    <CenterNav>
                        <NavTab to="/merchant/orders">Orders</NavTab>
                        <NavTab to="/merchant/inventory">Inventory</NavTab>
                        <NavTab to="/merchant/analytics" $active>
                            Metrics
                        </NavTab>
                        <NavTab to="/merchant/settings">Store</NavTab>
                    </CenterNav>

                    {/* Trailing Quick Actions */}
                    <HeaderActions>
                        <RoundButton
                            type="button"
                            title={soundEnabled ? 'Chime Alert Active' : 'Chime Alert Muted'}
                            onClick={() => setSoundEnabled((prev) => !prev)}
                            aria-label="Toggle chime alert"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                {soundEnabled ? 'volume_up' : 'volume_off'}
                            </span>
                        </RoundButton>

                        <RoundButton type="button" title="Notifications" aria-label="Notifications">
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                notifications
                            </span>
                            <AlertDot />
                        </RoundButton>

                        <ProfileChip>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px', color: '#b72301' }}
                            >
                                account_circle
                            </span>
                            <span>Counter 01</span>
                        </ProfileChip>
                    </HeaderActions>
                </TopBarInner>
            </TopBar>

            {/* Main Content Area */}
            <MainContent>
                {/* Subheader: Range Selection & Action Bar */}
                <DashboardHeader>
                    <div>
                        <HeaderTitleRow>
                            <PageTitle>Daily Store Performance</PageTitle>
                            <StatusPill>Fulfillment On-Track (98.4%)</StatusPill>
                        </HeaderTitleRow>
                        <PageDescription>
                            Real-time aggregated metrics for {storeName} (Station Road, Badarpur
                            Hub) • Enforcing Dropzo FR-PICK-001 Verification
                        </PageDescription>
                    </div>

                    <FilterControlsCluster>
                        {/* Date Segment Selector */}
                        <DateSegmentSelector>
                            <DateSegmentButton
                                type="button"
                                $active={dateRange === 'TODAY'}
                                onClick={() => setDateRange('TODAY')}
                            >
                                Today
                            </DateSegmentButton>
                            <DateSegmentButton
                                type="button"
                                $active={dateRange === 'YESTERDAY'}
                                onClick={() => setDateRange('YESTERDAY')}
                            >
                                Yesterday
                            </DateSegmentButton>
                            <DateSegmentButton
                                type="button"
                                $active={dateRange === 'LAST_7_DAYS'}
                                onClick={() => setDateRange('LAST_7_DAYS')}
                            >
                                Last 7 Days
                            </DateSegmentButton>
                            <DateSegmentButton
                                type="button"
                                $active={dateRange === 'THIS_MONTH'}
                                onClick={() => setDateRange('THIS_MONTH')}
                            >
                                This Month
                            </DateSegmentButton>
                        </DateSegmentSelector>

                        {/* Date Display Pill */}
                        <DateDisplayPill>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#8f7069' }}
                            >
                                calendar_today
                            </span>
                            <span>Today: Oct 24, 2025</span>
                        </DateDisplayPill>

                        {/* Actions */}
                        <ActionButton type="button" onClick={handleExport}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#b72301' }}
                            >
                                download
                            </span>
                            <span>Export CSV</span>
                        </ActionButton>

                        <ActionButton type="button" onClick={handlePrint} title="Print EOD Summary">
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#8f7069' }}
                            >
                                print
                            </span>
                            <span>Print Report</span>
                        </ActionButton>
                    </FilterControlsCluster>
                </DashboardHeader>

                {/* 5 KPI Metric Cards */}
                <KpiGrid>
                    {/* KPI 1: Gross Revenue */}
                    <KpiCard>
                        <div>
                            <KpiTopRow>
                                <KpiLabel>Today's Gross Revenue</KpiLabel>
                                <KpiIconBadge $variant="primary">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                        currency_rupee
                                    </span>
                                </KpiIconBadge>
                            </KpiTopRow>
                            <KpiValue>₹4,820</KpiValue>
                        </div>
                        <KpiFooter>
                            <span style={{ color: '#006e2d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                    trending_up
                                </span>
                                +14.2% vs yesterday
                            </span>
                            <span style={{ color: '#8f7069' }}>26 orders</span>
                        </KpiFooter>
                    </KpiCard>

                    {/* KPI 2: Channel Fulfillment Split */}
                    <KpiCard>
                        <div>
                            <KpiTopRow>
                                <KpiLabel>Channel Fulfillment Split</KpiLabel>
                                <KpiIconBadge $variant="neutral">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                        pie_chart
                                    </span>
                                </KpiIconBadge>
                            </KpiTopRow>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                <KpiValue style={{ fontSize: '1.25rem' }}>65%</KpiValue>
                                <span style={{ fontSize: '0.75rem', color: '#8f7069', fontWeight: 600 }}>
                                    Pickup vs 35% Del
                                </span>
                            </div>
                            <ChannelBarTrack>
                                <ChannelBarSegment $width="65%" $color="#b72301" title="Pickup ₹3,140" />
                                <ChannelBarSegment $width="35%" $color="#3298dc" title="Delivery ₹1,680" />
                            </ChannelBarTrack>
                        </div>
                        <KpiFooter>
                            <span style={{ color: '#b72301', fontWeight: 700 }}>Pickup: ₹3,140</span>
                            <span style={{ color: '#006398', fontWeight: 700 }}>Delivery: ₹1,680</span>
                        </KpiFooter>
                    </KpiCard>

                    {/* KPI 3: Average Order Value */}
                    <KpiCard>
                        <div>
                            <KpiTopRow>
                                <KpiLabel>Average Order Value</KpiLabel>
                                <KpiIconBadge $variant="neutral">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                        shopping_basket
                                    </span>
                                </KpiIconBadge>
                            </KpiTopRow>
                            <KpiValue>₹185.38</KpiValue>
                        </div>
                        <KpiFooter>
                            <span style={{ color: '#006e2d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                    arrow_upward
                                </span>
                                +₹12.00
                            </span>
                            <span style={{ color: '#8f7069' }}>vs 7-day avg</span>
                        </KpiFooter>
                    </KpiCard>

                    {/* KPI 4: Avg Fulfillment SLA */}
                    <KpiCard>
                        <div>
                            <KpiTopRow>
                                <KpiLabel>Avg Fulfillment SLA</KpiLabel>
                                <KpiIconBadge $variant="secondary">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                        timer
                                    </span>
                                </KpiIconBadge>
                            </KpiTopRow>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                <KpiValue>10.8</KpiValue>
                                <span style={{ fontSize: '0.875rem', color: '#8f7069', fontWeight: 700 }}>
                                    mins
                                </span>
                            </div>
                        </div>
                        <KpiFooter>
                            <span style={{ color: '#006e2d', fontWeight: 700 }}>98.4% on-time</span>
                            <span style={{ color: '#8f7069' }}>Goal &lt; 15 min</span>
                        </KpiFooter>
                    </KpiCard>

                    {/* KPI 5: PIN Verification Rate */}
                    <KpiCard $borderAccent="#006e2d">
                        <div>
                            <KpiTopRow>
                                <KpiLabel>PIN Verification Rate</KpiLabel>
                                <KpiIconBadge $variant="secondary">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                        verified_user
                                    </span>
                                </KpiIconBadge>
                            </KpiTopRow>
                            <KpiValue style={{ color: '#006e2d' }}>100%</KpiValue>
                        </div>
                        <KpiFooter>
                            <span style={{ color: '#5b403a', fontWeight: 600 }}>0 Pickup Lockouts</span>
                            <span style={{ backgroundColor: '#f4f2fd', padding: '0.125rem 0.375rem', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
                                FR-PICK-001
                            </span>
                        </KpiFooter>
                    </KpiCard>
                </KpiGrid>

                {/* Bento Grid: Charts & Funnel */}
                <BentoGrid>
                    {/* Left: Hourly Sales & Order Traffic Velocity */}
                    <CardContainer>
                        <div>
                            <CardHeaderRow>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CardTitle>Hourly Sales & Order Traffic Velocity</CardTitle>
                                        <span style={{ backgroundColor: '#ffdad3', color: '#b72301', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                                            Badarpur Station Hub
                                        </span>
                                    </div>
                                    <CardSubtitle>
                                        Real-time order influx comparing Morning Rush vs Afternoon Lull vs Evening Peak
                                    </CardSubtitle>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.6875rem', color: '#64748b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '2px', backgroundColor: '#b72301' }} />
                                        <span>Pickup (65%)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '2px', backgroundColor: '#3298dc' }} />
                                        <span>Delivery (35%)</span>
                                    </div>
                                </div>
                            </CardHeaderRow>

                            {/* Bar Chart Container */}
                            <BarChartContainer>
                                <BarChartGrid>
                                    {HOURLY_VELOCITY_DATA.map((item) => (
                                        <HourColumn key={item.hour}>
                                            <BarTooltip className="amount-tooltip">{item.amount}</BarTooltip>
                                            {item.isPeak && <PeakTag>Peak {item.amount}</PeakTag>}
                                            <BarStack>
                                                {item.deliveryHeight > 0 && (
                                                    <BarDelivery $height={item.deliveryHeight} />
                                                )}
                                                {item.pickupHeight > 0 && (
                                                    <BarPickup
                                                        $height={item.pickupHeight}
                                                        $isPeak={item.isPeak}
                                                    />
                                                )}
                                            </BarStack>
                                            <HourLabel $isBold={item.isPeak || item.isLive} $isHighlight={item.isPeak || item.isLive}>
                                                {item.label}
                                            </HourLabel>
                                        </HourColumn>
                                    ))}
                                </BarChartGrid>
                            </BarChartContainer>
                        </div>

                        {/* Annotation Banner */}
                        <InsightCallout>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#b72301' }}>
                                    lightbulb
                                </span>
                                <span>
                                    <strong>Badarpur Commuter Rush Insight:</strong> Evening commuter train
                                    arrivals between 5:30 PM & 7:00 PM account for 41% of daily pickup
                                    volume.
                                </span>
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#8f7069', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Predictive AI Active
                            </span>
                        </InsightCallout>
                    </CardContainer>

                    {/* Right: Fulfillment Funnel Speed */}
                    <CardContainer>
                        <div>
                            <CardHeaderRow>
                                <div>
                                    <CardTitle>Fulfillment Funnel Speed</CardTitle>
                                    <CardSubtitle>Time benchmarks across order lifecycle stages</CardSubtitle>
                                </div>
                                <span style={{ backgroundColor: '#dcfce7', color: '#006e2d', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                                    Fast Track
                                </span>
                            </CardHeaderRow>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                {/* Stage 1 */}
                                <FunnelStageBox>
                                    <FunnelStageHeader>
                                        <span>
                                            <StageIndicatorDot $color="#b72301" />
                                            1. Order Accepted
                                        </span>
                                        <span>Avg 42 sec</span>
                                    </FunnelStageHeader>
                                    <ProgressBar>
                                        <ProgressFill $width="25%" $color="#b72301" />
                                    </ProgressBar>
                                    <span style={{ fontSize: '0.6875rem', color: '#8f7069', marginTop: '0.25rem', display: 'block' }}>
                                        Benchmark: &lt; 60 seconds (Auto-Chime On)
                                    </span>
                                </FunnelStageBox>

                                {/* Stage 2 */}
                                <FunnelStageBox>
                                    <FunnelStageHeader>
                                        <span>
                                            <StageIndicatorDot $color="#006398" />
                                            2. Packing & Bagging
                                        </span>
                                        <span>Avg 6.4 mins</span>
                                    </FunnelStageHeader>
                                    <ProgressBar>
                                        <ProgressFill $width="65%" $color="#006398" />
                                    </ProgressBar>
                                    <span style={{ fontSize: '0.6875rem', color: '#8f7069', marginTop: '0.25rem', display: 'block' }}>
                                        Barcode scan verification enabled
                                    </span>
                                </FunnelStageBox>

                                {/* Stage 3 */}
                                <FunnelStageBox>
                                    <FunnelStageHeader>
                                        <span>
                                            <StageIndicatorDot $color="#006e2d" />
                                            3. Counter PIN Handoff
                                        </span>
                                        <span>Avg 3.8 mins</span>
                                    </FunnelStageHeader>
                                    <ProgressBar>
                                        <ProgressFill $width="40%" $color="#006e2d" />
                                    </ProgressBar>
                                    <span style={{ fontSize: '0.6875rem', color: '#006e2d', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>
                                        OTP / 6-Digit PIN Verified handoff
                                    </span>
                                </FunnelStageBox>
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e3e1ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#5b403a' }}>
                                Total Cycle Time
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#006e2d' }}>
                                    10.8 Mins
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: '#8f7069' }}>(Limit: 15.0m)</span>
                            </div>
                        </div>
                    </CardContainer>
                </BentoGrid>

                {/* Balanced Grid: Top SKUs Leaderboard & Settlement */}
                <BalancedGrid>
                    {/* Top Selling SKUs Leaderboard */}
                    <CardContainer>
                        <div>
                            <CardHeaderRow>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CardTitle>Top Selling SKUs & Velocity Leaderboard</CardTitle>
                                        <span style={{ backgroundColor: '#f4f2fd', color: '#5b403a', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                            5 Priority Items
                                        </span>
                                    </div>
                                    <CardSubtitle>Ranked by units moved today in Station Road counter</CardSubtitle>
                                </div>
                                <Link
                                    to="/merchant/inventory"
                                    style={{ color: '#b72301', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                >
                                    <span>View All 214 SKUs</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                        arrow_forward
                                    </span>
                                </Link>
                            </CardHeaderRow>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.5rem' }}>
                                {TOP_SKUS_DATA.map((sku) => (
                                    <SkuRow key={sku.rank} $special={sku.isSpecial}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                            <SkuRankBadge $isTop={sku.rank === 1}>
                                                {sku.rank}
                                            </SkuRankBadge>
                                            <SkuInfo>
                                                <SkuTitleRow>
                                                    <SkuName>{sku.name}</SkuName>
                                                    <SkuBadge>{sku.packSize}</SkuBadge>
                                                </SkuTitleRow>
                                                <SkuMeta>{sku.healthTag}</SkuMeta>
                                            </SkuInfo>
                                        </div>
                                        <SkuStats>
                                            <SkuUnits>{sku.units} units</SkuUnits>
                                            <SkuRevenue>{sku.revenue} revenue</SkuRevenue>
                                        </SkuStats>
                                    </SkuRow>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e3e1ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8f7069' }}>
                            <span>Inventory synced with Dropzo Catalog Cloud</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.6875rem' }}>Refreshed 2m ago</span>
                        </div>
                    </CardContainer>

                    {/* Payment Settlement & Collections */}
                    <CardContainer>
                        <div>
                            <CardHeaderRow>
                                <div>
                                    <CardTitle>Settlement & Collections</CardTitle>
                                    <CardSubtitle>Counter Cash vs Online settlement reconciliation</CardSubtitle>
                                </div>
                                <span style={{ backgroundColor: '#f4f2fd', color: '#5b403a', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                    FR-PAY-001
                                </span>
                            </CardHeaderRow>

                            <SettlementMatrix>
                                {/* Row 1: COD Cash at Counter */}
                                <SettlementRow>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <SettlementIcon $bg="#dcfce7" $color="#006e2d">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                payments
                                            </span>
                                        </SettlementIcon>
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                Cash / Pay at Counter (COD)
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: '#8f7069' }}>
                                                Physically collected in cash drawer
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>₹3,620</span>
                                </SettlementRow>

                                <div style={{ borderTop: '1px solid #e3e1ec' }} />

                                {/* Row 2: UPI Direct / Online Pre-paid */}
                                <SettlementRow>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <SettlementIcon $bg="#cce5ff" $color="#006398">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                qr_code_scanner
                                            </span>
                                        </SettlementIcon>
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                UPI Direct / Online Pre-paid
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: '#8f7069' }}>
                                                Settled directly via UPI gateway
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>₹1,200</span>
                                </SettlementRow>

                                <div style={{ borderTop: '1px solid #e3e1ec' }} />

                                {/* Row 3: Platform Commission */}
                                <SettlementRow>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <SettlementIcon $bg="#eeedf7" $color="#5b403a">
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                                percent
                                            </span>
                                        </SettlementIcon>
                                        <div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                                Dropzo Merchant Commission
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: '#006e2d', fontWeight: 700 }}>
                                                0% Launch Partner Promo Applied
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#006e2d' }}>
                                        ₹0.00
                                    </span>
                                </SettlementRow>
                            </SettlementMatrix>

                            {/* Total Realized Daily Earnings Banner */}
                            <RealizedEarningsBanner>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#b72301' }}>
                                        Total Daily Realized Earnings
                                    </span>
                                    <span style={{ backgroundColor: '#006e2d', color: '#ffffff', fontSize: '0.625rem', fontWeight: 800, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                                        Automated Transfer
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b72301', letterSpacing: '-0.02em' }}>
                                        ₹4,820.00
                                    </span>
                                    <span style={{ fontSize: '0.6875rem', color: '#5b403a', fontWeight: 600 }}>
                                        Scheduled Today • 11:00 PM IST
                                    </span>
                                </div>
                            </RealizedEarningsBanner>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: '#8f7069' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                shield
                            </span>
                            <span>Linked Account: State Bank of India (Badarpur Branch •••• 4092)</span>
                        </div>
                    </CardContainer>
                </BalancedGrid>

                {/* Section 6: Operational Alerts & Insights */}
                <AlertsGrid>
                    {/* Alert 1: Stock Depletion */}
                    <AlertCard $accentColor="#b72301" $borderAccent="#ffdad6">
                        <AlertIconBox $bg="#ffdad6" $color="#93000a">
                            <span className="material-symbols-outlined">warning</span>
                        </AlertIconBox>
                        <AlertBody>
                            <AlertTitleRow>
                                <AlertTitle>Urgent Stock Depletion: Barak Kazi Nemu</AlertTitle>
                                <AlertBadge $bg="#ffdad3" $color="#b72301">
                                    Running out in ~1.8 hrs
                                </AlertBadge>
                            </AlertTitleRow>
                            <AlertText>
                                Current sales pace is <strong>4.2 packs/hr</strong>. Counter inventory
                                has only 4 packs remaining. Local demand is surging for dinner fish curry
                                preparation in Badarpur Station Ward.
                            </AlertText>
                            <AlertActionsCluster>
                                <PrimaryButton type="button">
                                    Request Hub Restock (+30 Packs)
                                </PrimaryButton>
                                <SecondaryButton type="button">Mark Limited Stock</SecondaryButton>
                            </AlertActionsCluster>
                        </AlertBody>
                    </AlertCard>

                    {/* Alert 2: Commuter Surge Forecast */}
                    <AlertCard $accentColor="#006398">
                        <AlertIconBox $bg="#cce5ff" $color="#002d48">
                            <span className="material-symbols-outlined">train</span>
                        </AlertIconBox>
                        <AlertBody>
                            <AlertTitleRow>
                                <AlertTitle>Silchar-Badarpur Commuter Peak Ahead</AlertTitle>
                                <AlertBadge $bg="#cce5ff" $color="#006398">
                                    5:30 PM - 7:00 PM
                                </AlertBadge>
                            </AlertTitleRow>
                            <AlertText>
                                Forecast projects <strong>+15 pickup orders</strong> as office trains
                                arrive at Badarpur Junction. Pre-bagging standard staples (Basmati Rice,
                                Fortune Oil, Amul Butter) will maintain under 10m SLA.
                            </AlertText>
                            <AlertActionsCluster>
                                <SecondaryButton type="button" style={{ fontWeight: 700 }}>
                                    Open Secondary Pickup Staging Bin
                                </SecondaryButton>
                                <span style={{ fontSize: '0.6875rem', color: '#8f7069', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '14px', color: '#006e2d' }}
                                    >
                                        check_circle
                                    </span>
                                    Staff Assigned: Counter 01 & 02
                                </span>
                            </AlertActionsCluster>
                        </AlertBody>
                    </AlertCard>
                </AlertsGrid>
            </MainContent>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav>
                <MobileNavItem to="/merchant/orders">
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
                <MobileNavItem to="/merchant/analytics" $active>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        monitoring
                    </span>
                    <span>Metrics</span>
                </MobileNavItem>
                <MobileNavItem to="/merchant/settings">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        store
                    </span>
                    <span>Store</span>
                </MobileNavItem>
            </MobileBottomNav>
        </PageContainer>
    );
}

export default MerchantAnalyticsPage;
