import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { Order, OrderStatus } from '@dropzo/api-client';
import { typeScale, media } from '../../theme';
import { Skeleton } from '../../components/ui';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: #f8f9fa;
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 5.5rem;

    ${media.desktop} {
        padding-bottom: 0;
    }
`;

// Mobile Sticky Header
const MobileStickyHeader = styled.header`
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(251, 248, 255, 0.92);
    backdrop-filter: blur(12px);
    padding: 0.75rem 1rem 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid rgba(228, 190, 182, 0.3);

    ${media.desktop} {
        display: none;
    }
`;

const MobileHeaderTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
`;

const IconButton = styled.button`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: 1px solid rgba(228, 190, 182, 0.3);
    color: ${({ theme }) => theme.colors.textPrimary};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.15s ease;

    &:active {
        transform: scale(0.95);
    }
`;

const MobileHeaderCenter = styled.div`
    flex: 1;
    text-align: center;
`;

const MobileHeaderTitle = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
    line-height: 1.2;
`;

const MobileLocationRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 0.125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    ${({ theme }) => typeScale(theme.typography.labelSm)}

    span.icon {
        color: ${({ theme }) => theme.colors.primary};
        font-size: 14px;
    }
`;

// Desktop Top Navigation Bar
const DesktopNavBar = styled.header`
    display: none;

    ${media.desktop} {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 2rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid rgba(227, 225, 236, 0.7);
        position: sticky;
        top: 0;
        z-index: 40;
    }
`;

const DesktopBrandRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const BrandIcon = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 4px 0 rgba(255, 87, 51, 0.3);
`;

const BrandTitle = styled.span`
    ${({ theme }) => typeScale(theme.typography.headlineLg)}
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.015em;
`;

const LocationPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid rgba(227, 225, 236, 0.8);
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
`;

// Search & Filter Box
const SearchBarWrapper = styled.div`
    position: relative;
    width: 100%;
    margin-top: 0.5rem;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 2.25rem;
    border-radius: 9999px;
    border: 1px solid #e4e4e7;
    background: #ffffff;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    outline: none;
    transition: all 0.15s ease;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.12);
    }

    &::placeholder {
        color: rgba(91, 64, 58, 0.6);
    }
`;

const FilterTabsNav = styled.nav`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.625rem;
    overflow-x: auto;
    padding: 0.125rem 0;

    &::-webkit-scrollbar {
        display: none;
    }
    scrollbar-width: none;
`;

const FilterTabPill = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid ${({ $active }) => ($active ? 'transparent' : '#e4e4e7')};
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : '#ffffff')};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: ${({ $active }) => ($active ? '700' : '600')};
    box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(255, 87, 51, 0.3)' : 'none')};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ $active }) => ($active ? '#e04826' : '#f4f2fd')};
    }
`;

const PulseDot = styled.span`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #7cf994;
    display: inline-block;
    animation: pulse 1.5s infinite;

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: scale(1);
        }
        50% {
            opacity: 0.4;
            transform: scale(0.85);
        }
    }
`;

// Desktop Two-Column Grid Canvas
const MainCanvas = styled.main`
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    ${media.desktop} {
        display: grid;
        grid-template-columns: 18rem minmax(0, 1fr);
        gap: 2rem;
        padding: 2rem;
    }
`;

// Desktop Left Sidebar
const LeftSidebar = styled.aside`
    display: none;

    ${media.desktop} {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
`;

const UserProfileCard = styled.div`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    border: 1px solid rgba(228, 190, 182, 0.4);
    box-shadow: 0 2px 8px -2px rgba(24, 24, 27, 0.05);
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const UserAvatar = styled.div`
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.125rem;
`;

const UserDetails = styled.div`
    flex: 1;

    h3 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.labelLg)}
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
    }

    p {
        margin: 0.125rem 0 0;
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textSecondary};
    }
`;

const SidebarNavList = styled.nav`
    background: #ffffff;
    border-radius: 1rem;
    padding: 0.5rem;
    border: 1px solid rgba(228, 190, 182, 0.4);
    box-shadow: 0 2px 8px -2px rgba(24, 24, 27, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const SidebarNavItem = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    text-decoration: none;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: ${({ $active }) => ($active ? '700' : '600')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textPrimary)};
    background: ${({ $active }) => ($active ? 'rgba(255, 87, 51, 0.08)' : 'transparent')};
    transition: all 0.15s ease;

    &:hover {
        background: ${({ $active }) => ($active ? 'rgba(255, 87, 51, 0.12)' : '#f4f2fd')};
    }

    div.left {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }
`;

const StatsSummaryCard = styled.div`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    border: 1px solid rgba(228, 190, 182, 0.4);
    box-shadow: 0 2px 8px -2px rgba(24, 24, 27, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    h4 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        text-transform: uppercase;
        color: ${({ theme }) => theme.colors.textSecondary};
        letter-spacing: 0.05em;
    }

    div.grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    div.stat {
        background: #f8f9fa;
        padding: 0.75rem;
        border-radius: 0.75rem;
        border: 1px solid #f1f5f9;

        span.num {
            ${({ theme }) => typeScale(theme.typography.headlineSm)}
            font-weight: 800;
            color: ${({ theme }) => theme.colors.textPrimary};
            display: block;
        }

        span.lbl {
            font-size: 0.6875rem;
            color: ${({ theme }) => theme.colors.textSecondary};
            font-weight: 600;
        }
    }
`;

// Right Content Panel
const ContentPanel = styled.section`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const SectionHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.25rem;
`;

const SectionTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;

    span.icon {
        color: ${({ theme }) => theme.colors.primary};
        font-size: 20px;
    }

    h2 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.labelLg)}
        font-weight: 800;
        color: ${({ theme }) => theme.colors.textPrimary};
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
`;

const SectionPillBadge = styled.span<{ $variant?: 'active' | 'neutral' }>`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: ${({ $variant }) => ($variant === 'active' ? '#dcfce7' : '#eeedf7')};
    color: ${({ $variant }) => ($variant === 'active' ? '#15803d' : '#5b403a')};
`;

// Active Orders Card Grid
const ActiveOrdersGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    ${media.desktop} {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
`;

const OrderCard = styled.article<{ $accent?: 'pickup' | 'delivery' }>`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    box-shadow: 0 4px 20px -2px rgba(24, 24, 27, 0.05);
    border: 1px solid #f1f5f9;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
        box-shadow: 0 8px 24px -4px rgba(24, 24, 27, 0.09);
    }

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: ${({ $accent }) =>
            $accent === 'pickup'
                ? 'linear-gradient(90deg, #006e2d 0%, #7cf994 100%)'
                : 'linear-gradient(90deg, #ff5733 0%, #fbbf24 100%)'};
    }
`;

const OrderCardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f4f4f5;
`;

const StoreIconBox = styled.div<{ $isPickup: boolean }>`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: ${({ $isPickup }) =>
        $isPickup ? 'rgba(0, 110, 45, 0.1)' : 'rgba(255, 87, 51, 0.1)'};
    color: ${({ $isPickup }) => ($isPickup ? '#006e2d' : '#ff5733')};
`;

const StoreMeta = styled.div`
    flex: 1;

    h3 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.headlineSm)}
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
        line-height: 1.25;
    }

    p.address {
        margin: 0.125rem 0 0;
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textSecondary};
        display: flex;
        align-items: center;
        gap: 0.375rem;
    }
`;

const StatusPill = styled.span<{ $status: OrderStatus }>`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    flex-shrink: 0;

    ${({ $status }) => {
        switch ($status) {
            case 'READY':
                return `background: #dcfce7; color: #15803d; border: 1px solid rgba(22, 163, 74, 0.2);`;
            case 'PREPARING':
                return `background: #fef3c7; color: #92400e; border: 1px solid #fde68a;`;
            case 'OUT_FOR_DELIVERY':
                return `background: #cce5ff; color: #004b73; border: 1px solid #93ccff;`;
            case 'ACCEPTED':
                return `background: #e8e7f1; color: #1a1b22;`;
            case 'COMPLETED':
            case 'DELIVERED':
            case 'PICKED_UP':
                return `background: #f4f2fd; color: #007230;`;
            case 'CANCELLED':
            case 'REJECTED':
            case 'DELIVERY_FAILED':
                return `background: #ffdad6; color: #ba1a1a;`;
            default:
                return `background: #eeedf7; color: #5b403a;`;
        }
    }}
`;

// Highlight Pickup Code Box
const PickupHighlightBox = styled.div`
    margin-top: 0.75rem;
    background: #f8f9fa;
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(228, 228, 231, 0.8);
    display: flex;
    align-items: center;
    justify-content: space-between;

    span.lbl {
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        text-transform: uppercase;
        color: ${({ theme }) => theme.colors.textSecondary};
        display: block;
        letter-spacing: 0.04em;
    }

    span.code {
        ${({ theme }) => typeScale(theme.typography.headlineSm)}
        font-weight: 800;
        color: ${({ theme }) => theme.colors.textPrimary};
        letter-spacing: 0.05em;

        strong {
            color: ${({ theme }) => theme.colors.primary};
        }
    }

    p.bay {
        margin: 0.125rem 0 0;
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        color: #006e2d;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
`;

// Delivery Progress Stepper
const StepperContainer = styled.div`
    margin-top: 1rem;
    position: relative;
    padding: 0 0.5rem;
`;

const StepperTrack = styled.div`
    position: absolute;
    left: 1.5rem;
    right: 1.5rem;
    top: 0.875rem;
    height: 4px;
    background: #e3e1ec;
    border-radius: 9999px;
    z-index: 0;
`;

const StepperProgress = styled.div<{ $progress: number }>`
    position: absolute;
    left: 1.5rem;
    width: ${({ $progress }) => `calc((100% - 3rem) * ${$progress})`};
    top: 0.875rem;
    height: 4px;
    background: #006e2d;
    border-radius: 9999px;
    z-index: 0;
`;

const StepperStepsRow = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
`;

const StepperStep = styled.div<{ $state: 'done' | 'active' | 'pending' }>`
    display: flex;
    flex-direction: column;
    align-items: center;

    div.dot {
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${({ $state, theme }) =>
            $state === 'done' ? '#006e2d' : $state === 'active' ? theme.colors.primary : '#e3e1ec'};
        color: ${({ $state }) => ($state === 'pending' ? '#5b403a' : '#ffffff')};
        box-shadow: ${({ $state }) =>
            $state === 'active' ? '0 0 0 4px rgba(255, 87, 51, 0.2)' : 'none'};

        span {
            font-size: 14px;
        }
    }

    span.name {
        margin-top: 0.375rem;
        font-size: 0.6875rem;
        font-weight: ${({ $state }) => ($state === 'active' ? '700' : '600')};
        color: ${({ $state, theme }) =>
            $state === 'active' ? theme.colors.primary : theme.colors.textPrimary};
    }
`;

// Items Preview Box
const ItemsSummaryBox = styled.div`
    margin-top: 0.875rem;
    background: #f8f9fa;
    border-radius: 0.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid #f1f5f9;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};

    div.title {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
        margin-bottom: 0.125rem;
    }
`;

// Price & Actions
const OrderFinancialRow = styled.div`
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f4f4f5;
    display: flex;
    align-items: center;
    justify-content: space-between;

    span.lbl {
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        color: ${({ theme }) => theme.colors.textSecondary};
        display: block;
    }

    div.amt-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    span.total {
        ${({ theme }) => typeScale(theme.typography.headlineSm)}
        font-weight: 800;
        color: ${({ theme }) => theme.colors.textPrimary};
    }

    span.pay-tag {
        font-size: 0.6875rem;
        padding: 0.125rem 0.5rem;
        border-radius: 0.25rem;
        background: #eeedf7;
        color: #5b403a;
        font-weight: 600;
    }
`;

const ActionsGrid = styled.div`
    margin-top: 0.875rem;
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 0.5rem;
`;

const SecondaryBtn = styled(Link)`
    padding: 0.625rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid #e4e4e7;
    background: #ffffff;
    color: ${({ theme }) => theme.colors.textPrimary};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        background: #f4f2fd;
    }

    &:active {
        transform: scale(0.97);
    }
`;

const PrimaryTrackBtn = styled(Link)`
    padding: 0.625rem 1rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    text-decoration: none;
    box-shadow: 0 4px 14px 0 rgba(255, 87, 51, 0.35);
    transition: all 0.15s ease;

    &:hover {
        background: #e04826;
    }

    &:active {
        transform: scale(0.97);
    }
`;

// Past Orders List
const PastOrdersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
`;

const PastOrderCard = styled.article`
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    box-shadow: 0 4px 20px -2px rgba(24, 24, 27, 0.04);
    border: 1px solid #f1f5f9;
`;

const PastOrderTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    h3 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.labelLg)}
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
    }

    p.date {
        margin: 0.125rem 0 0;
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        color: ${({ theme }) => theme.colors.textSecondary};
    }
`;

const PastOrderItemsRow = styled.div`
    margin-top: 0.625rem;
    padding-top: 0.625rem;
    border-top: 1px solid #f4f4f5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    p.items {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textSecondary};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        strong {
            color: ${({ theme }) => theme.colors.textPrimary};
        }
    }

    span.price {
        ${({ theme }) => typeScale(theme.typography.headlineSm)}
        font-weight: 800;
        color: ${({ theme }) => theme.colors.textPrimary};
        flex-shrink: 0;
    }
`;

const PastOrderActionsRow = styled.div`
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #f4f4f5;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const TextActionLink = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    font-weight: 600;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
        text-decoration: underline;
    }
`;

const ReorderPill = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    text-decoration: none;
    transition: all 0.15s ease;

    &:hover {
        background: rgba(255, 87, 51, 0.08);
    }

    &:active {
        transform: scale(0.95);
    }
`;

// Guarantee Reassurance Banner
const GuaranteeCard = styled.div`
    background: #f4f2fd;
    border-radius: 0.875rem;
    padding: 1rem;
    border: 1px solid rgba(228, 190, 182, 0.4);
    display: flex;
    align-items: center;
    gap: 0.875rem;
    margin-top: 0.5rem;

    div.icon {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background: rgba(0, 110, 45, 0.1);
        color: #006e2d;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    p.title {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
    }

    p.sub {
        margin: 0.125rem 0 0;
        font-size: 0.75rem;
        color: ${({ theme }) => theme.colors.textSecondary};
        line-height: 1.3;
    }
`;

// Floating Bottom Nav Bar (Mobile)
const FloatingBottomNav = styled.div`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 50;
    pointer-events: none;
    padding: 0.5rem 1rem 0.75rem;

    ${media.desktop} {
        display: none;
    }

    nav {
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(12px);
        max-width: 26rem;
        margin: 0 auto;
        border-radius: 9999px;
        border: 1px solid rgba(228, 190, 182, 0.4);
        box-shadow: 0 10px 30px -4px rgba(24, 24, 27, 0.12);
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 0.375rem 0.5rem;
    }
`;

const NavTab = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: 9999px;
    text-decoration: none;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: ${({ $active }) => ($active ? '700' : '500')};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(255, 87, 51, 0.3)' : 'none')};
    transition: all 0.15s ease;

    span.icon {
        font-size: 20px;
    }
`;

// Empty State Box
const EmptyOrdersBox = styled.div`
    background: #ffffff;
    border-radius: 1rem;
    padding: 3rem 1.5rem;
    text-align: center;
    border: 1px solid #f1f5f9;
    box-shadow: 0 4px 20px -2px rgba(24, 24, 27, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;

    div.icon-circle {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: rgba(255, 87, 51, 0.1);
        color: ${({ theme }) => theme.colors.primary};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
    }

    h3 {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.headlineSm)}
        color: ${({ theme }) => theme.colors.textPrimary};
    }

    p {
        margin: 0;
        ${({ theme }) => typeScale(theme.typography.bodyMd)}
        color: ${({ theme }) => theme.colors.textSecondary};
        max-width: 24rem;
    }
`;

const BrowseStoresButton = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 4px 14px 0 rgba(255, 87, 51, 0.35);
`;

// Canonical Desktop Footer
const Footer = styled.footer`
    display: none;

    ${media.desktop} {
        display: block;
        margin-top: 4rem;
        background: #eeedf7;
        border-top: 1px solid rgba(227, 225, 236, 0.8);
    }
`;

const FooterInner = styled.div`
    max-width: 80rem;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

// ==================== HELPER UTILS ====================

function isActiveStatus(status: OrderStatus): boolean {
    return ['CREATED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY'].includes(
        status,
    );
}

function isCompletedStatus(status: OrderStatus): boolean {
    return ['COMPLETED', 'DELIVERED', 'PICKED_UP'].includes(status);
}

function isCancelledStatus(status: OrderStatus): boolean {
    return ['CANCELLED', 'REJECTED', 'DELIVERY_FAILED'].includes(status);
}

function formatStatusLabel(status: OrderStatus): string {
    switch (status) {
        case 'READY':
            return 'READY FOR PICKUP';
        case 'PREPARING':
            return 'PREPARING (8 mins)';
        case 'OUT_FOR_DELIVERY':
            return 'OUT FOR DELIVERY';
        case 'ASSIGNED':
            return 'RIDER ASSIGNED';
        case 'ACCEPTED':
            return 'ORDER ACCEPTED';
        case 'CREATED':
            return 'ORDER PLACED';
        case 'PICKED_UP':
        case 'COMPLETED':
            return 'COMPLETED (PICKED UP)';
        case 'DELIVERED':
            return 'DELIVERED';
        case 'CANCELLED':
            return 'CANCELLED';
        case 'REJECTED':
            return 'REJECTED';
        case 'DELIVERY_FAILED':
            return 'DELIVERY FAILED';
        default:
            return status;
    }
}

function formatOrderDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return dateStr;
    }
}

// ==================== MAIN COMPONENT ====================

export function CustomerOrdersPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

    const ordersQuery = useQuery({
        queryKey: ['customer-orders'],
        queryFn: () => apiClient.listOwnOrders({ page: 1, limit: 50 }),
    });

    const orders: Order[] = useMemo(() => {
        return ordersQuery.data?.data || [];
    }, [ordersQuery.data]);

    // Derived counts
    const activeOrders = useMemo(() => orders.filter((o) => isActiveStatus(o.status)), [orders]);
    const completedOrders = useMemo(
        () => orders.filter((o) => isCompletedStatus(o.status)),
        [orders],
    );
    const cancelledOrders = useMemo(
        () => orders.filter((o) => isCancelledStatus(o.status)),
        [orders],
    );

    const totalSpent = useMemo(() => {
        return completedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    }, [completedOrders]);

    // Filtered by tab and search
    const filteredOrders = useMemo(() => {
        let list = orders;
        if (activeTab === 'ACTIVE') list = activeOrders;
        else if (activeTab === 'COMPLETED') list = completedOrders;
        else if (activeTab === 'CANCELLED') list = cancelledOrders;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (o) =>
                    o.order_number.toLowerCase().includes(q) ||
                    o.store_name_snapshot.toLowerCase().includes(q) ||
                    o.items?.some((i) => i.product_name_snapshot.toLowerCase().includes(q)),
            );
        }
        return list;
    }, [orders, activeTab, activeOrders, completedOrders, cancelledOrders, searchQuery]);

    const activeList = useMemo(
        () => filteredOrders.filter((o) => isActiveStatus(o.status)),
        [filteredOrders],
    );
    const pastList = useMemo(
        () => filteredOrders.filter((o) => !isActiveStatus(o.status)),
        [filteredOrders],
    );

    return (
        <PageContainer>
            {/* Mobile Header */}
            <MobileStickyHeader>
                <MobileHeaderTop>
                    <IconButton
                        type="button"
                        aria-label="Back to home"
                        onClick={() => navigate('/')}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </IconButton>
                    <MobileHeaderCenter>
                        <MobileHeaderTitle>My Orders</MobileHeaderTitle>
                        <MobileLocationRow>
                            <span className="material-symbols-outlined icon">location_on</span>
                            <span>Station Road, Badarpur (Sribhumi)</span>
                        </MobileLocationRow>
                    </MobileHeaderCenter>
                    <IconButton type="button" aria-label="Help desk" onClick={() => navigate('/')}>
                        <span className="material-symbols-outlined">help_outline</span>
                    </IconButton>
                </MobileHeaderTop>

                {/* Search Bar */}
                <SearchBarWrapper>
                    <span
                        className="material-symbols-outlined"
                        style={{
                            position: 'absolute',
                            left: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#8f7069',
                            fontSize: '18px',
                        }}
                    >
                        search
                    </span>
                    <SearchInput
                        placeholder="Search orders, groceries or store names..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search orders"
                    />
                </SearchBarWrapper>

                {/* Filter Pill Tabs */}
                <FilterTabsNav role="tablist">
                    <FilterTabPill
                        type="button"
                        $active={activeTab === 'ALL'}
                        onClick={() => setActiveTab('ALL')}
                        role="tab"
                    >
                        All ({orders.length})
                    </FilterTabPill>
                    <FilterTabPill
                        type="button"
                        $active={activeTab === 'ACTIVE'}
                        onClick={() => setActiveTab('ACTIVE')}
                        role="tab"
                    >
                        <span>Active ({activeOrders.length})</span>
                        {activeOrders.length > 0 && <PulseDot />}
                    </FilterTabPill>
                    <FilterTabPill
                        type="button"
                        $active={activeTab === 'COMPLETED'}
                        onClick={() => setActiveTab('COMPLETED')}
                        role="tab"
                    >
                        Completed ({completedOrders.length})
                    </FilterTabPill>
                    <FilterTabPill
                        type="button"
                        $active={activeTab === 'CANCELLED'}
                        onClick={() => setActiveTab('CANCELLED')}
                        role="tab"
                    >
                        Cancelled ({cancelledOrders.length})
                    </FilterTabPill>
                </FilterTabsNav>
            </MobileStickyHeader>

            {/* Desktop Navigation Bar */}
            <DesktopNavBar>
                <DesktopBrandRow>
                    <BrandIcon>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            bolt
                        </span>
                    </BrandIcon>
                    <BrandTitle>Dropzo</BrandTitle>
                    <LocationPill>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: '#006e2d' }}
                        >
                            location_on
                        </span>
                        <span>Badarpur Central Hub • Station Road, Badarpur (Sribhumi)</span>
                    </LocationPill>
                </DesktopBrandRow>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <SearchBarWrapper style={{ width: '22rem', margin: 0 }}>
                        <span
                            className="material-symbols-outlined"
                            style={{
                                position: 'absolute',
                                left: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#8f7069',
                                fontSize: '18px',
                            }}
                        >
                            search
                        </span>
                        <SearchInput
                            placeholder="Search orders, groceries or store names..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search orders desktop"
                        />
                    </SearchBarWrapper>

                    <IconButton
                        type="button"
                        aria-label="Go to Marketplace Home"
                        onClick={() => navigate('/')}
                    >
                        <span className="material-symbols-outlined">storefront</span>
                    </IconButton>
                </div>
            </DesktopNavBar>

            {/* Main Canvas */}
            <MainCanvas>
                {/* Desktop Left Sidebar */}
                <LeftSidebar>
                    <UserProfileCard>
                        <UserAvatar>RS</UserAvatar>
                        <UserDetails>
                            <h3>Dropzo Customer</h3>
                            <p>Badarpur Station Road</p>
                        </UserDetails>
                    </UserProfileCard>

                    <SidebarNavList>
                        <SidebarNavItem to="/orders" $active>
                            <div className="left">
                                <span className="material-symbols-outlined">receipt_long</span>
                                <span>My Orders</span>
                            </div>
                            <span style={{ fontWeight: 700 }}>{orders.length}</span>
                        </SidebarNavItem>
                        <SidebarNavItem to="/">
                            <div className="left">
                                <span className="material-symbols-outlined">storefront</span>
                                <span>Stores &amp; Mandi</span>
                            </div>
                        </SidebarNavItem>
                        <SidebarNavItem to="/checkout">
                            <div className="left">
                                <span className="material-symbols-outlined">shopping_cart</span>
                                <span>Current Cart</span>
                            </div>
                        </SidebarNavItem>
                    </SidebarNavList>

                    <StatsSummaryCard>
                        <h4>Order Statistics</h4>
                        <div className="grid">
                            <div className="stat">
                                <span className="num">{orders.length}</span>
                                <span className="lbl">Total Orders</span>
                            </div>
                            <div className="stat">
                                <span className="num">{activeOrders.length}</span>
                                <span className="lbl">Active Now</span>
                            </div>
                            <div className="stat">
                                <span className="num">₹{totalSpent}</span>
                                <span className="lbl">Total Spent</span>
                            </div>
                            <div className="stat">
                                <span className="num">{completedOrders.length}</span>
                                <span className="lbl">Completed</span>
                            </div>
                        </div>
                    </StatsSummaryCard>
                </LeftSidebar>

                {/* Right Content Panel */}
                <ContentPanel>
                    {/* Loading State */}
                    {ordersQuery.isLoading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Skeleton $height="10rem" />
                            <Skeleton $height="8rem" />
                            <Skeleton $height="8rem" />
                        </div>
                    )}

                    {/* Empty State */}
                    {!ordersQuery.isLoading && filteredOrders.length === 0 && (
                        <EmptyOrdersBox>
                            <div className="icon-circle">
                                <span className="material-symbols-outlined">receipt_long</span>
                            </div>
                            <h3>No orders found</h3>
                            <p>
                                {searchQuery.trim()
                                    ? `No orders matching "${searchQuery}". Try a different search.`
                                    : 'Orders you place from Badarpur local kiranas will appear here for 1-minute counter pickup or 15-minute home delivery.'}
                            </p>
                            <BrowseStoresButton to="/">
                                <span className="material-symbols-outlined">storefront</span>
                                <span>Browse Badarpur Kiranas</span>
                            </BrowseStoresButton>
                        </EmptyOrdersBox>
                    )}

                    {/* SECTION 1: Active Orders */}
                    {!ordersQuery.isLoading && activeList.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <SectionHeaderRow>
                                <SectionTitleRow>
                                    <span className="material-symbols-outlined icon">bolt</span>
                                    <h2>Active Deliveries &amp; Pickups</h2>
                                </SectionTitleRow>
                                <SectionPillBadge $variant="active">
                                    {activeList.length} IN PROGRESS
                                </SectionPillBadge>
                            </SectionHeaderRow>

                            <ActiveOrdersGrid>
                                {activeList.map((order) => {
                                    const isPickup = order.fulfilment_type === 'PICKUP';
                                    const itemCount =
                                        order.items?.reduce(
                                            (sum, i) => sum + Number(i.quantity || 1),
                                            0,
                                        ) ||
                                        order.items?.length ||
                                        1;
                                    const itemSummary = order.items
                                        ?.map((i) => `${i.product_name_snapshot} (${i.quantity})`)
                                        .join(', ');

                                    return (
                                        <OrderCard
                                            key={order.id}
                                            $accent={isPickup ? 'pickup' : 'delivery'}
                                        >
                                            <OrderCardTop>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        gap: '0.625rem',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <StoreIconBox $isPickup={isPickup}>
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '22px' }}
                                                        >
                                                            {isPickup
                                                                ? 'storefront'
                                                                : 'two_wheeler'}
                                                        </span>
                                                    </StoreIconBox>
                                                    <StoreMeta>
                                                        <h3>{order.store_name_snapshot}</h3>
                                                        <p className="address">
                                                            <span>
                                                                {order.store_address_snapshot ||
                                                                    'Station Road, Badarpur'}
                                                            </span>
                                                            <span>•</span>
                                                            <strong
                                                                style={{
                                                                    color: isPickup
                                                                        ? '#006e2d'
                                                                        : '#ff5733',
                                                                }}
                                                            >
                                                                {isPickup
                                                                    ? 'Store Pickup'
                                                                    : 'Express Delivery'}
                                                            </strong>
                                                        </p>
                                                    </StoreMeta>
                                                </div>
                                                <StatusPill $status={order.status}>
                                                    {formatStatusLabel(order.status)}
                                                </StatusPill>
                                            </OrderCardTop>

                                            {/* Pickup Verification Box */}
                                            {isPickup && (
                                                <PickupHighlightBox>
                                                    <div>
                                                        <span className="lbl">
                                                            Pickup Verification
                                                        </span>
                                                        <span className="code">
                                                            Counter Code:{' '}
                                                            <strong>Ready at Bay #2</strong>
                                                        </span>
                                                        <p className="bay">
                                                            <span
                                                                className="material-symbols-outlined"
                                                                style={{ fontSize: '14px' }}
                                                            >
                                                                done_all
                                                            </span>
                                                            <span>Show code at shop counter</span>
                                                        </p>
                                                    </div>
                                                    <IconButton
                                                        type="button"
                                                        aria-label="View QR code"
                                                        onClick={() =>
                                                            navigate(`/orders/${order.id}`)
                                                        }
                                                    >
                                                        <span className="material-symbols-outlined">
                                                            qr_code_2
                                                        </span>
                                                    </IconButton>
                                                </PickupHighlightBox>
                                            )}

                                            {/* Delivery Stepper Component */}
                                            {!isPickup && (
                                                <StepperContainer>
                                                    <StepperTrack />
                                                    <StepperProgress
                                                        $progress={
                                                            order.status === 'OUT_FOR_DELIVERY'
                                                                ? 0.75
                                                                : order.status === 'PREPARING'
                                                                  ? 0.5
                                                                  : 0.25
                                                        }
                                                    />
                                                    <StepperStepsRow>
                                                        <StepperStep $state="done">
                                                            <div className="dot">
                                                                <span className="material-symbols-outlined">
                                                                    check
                                                                </span>
                                                            </div>
                                                            <span className="name">Confirmed</span>
                                                        </StepperStep>
                                                        <StepperStep
                                                            $state={
                                                                order.status === 'PREPARING'
                                                                    ? 'active'
                                                                    : order.status ===
                                                                        'OUT_FOR_DELIVERY'
                                                                      ? 'done'
                                                                      : 'pending'
                                                            }
                                                        >
                                                            <div className="dot">
                                                                <span className="material-symbols-outlined">
                                                                    inventory_2
                                                                </span>
                                                            </div>
                                                            <span className="name">Packing</span>
                                                        </StepperStep>
                                                        <StepperStep
                                                            $state={
                                                                order.status === 'OUT_FOR_DELIVERY'
                                                                    ? 'active'
                                                                    : 'pending'
                                                            }
                                                        >
                                                            <div className="dot">
                                                                <span className="material-symbols-outlined">
                                                                    electric_moped
                                                                </span>
                                                            </div>
                                                            <span className="name">On the way</span>
                                                        </StepperStep>
                                                    </StepperStepsRow>
                                                </StepperContainer>
                                            )}

                                            {/* Items text summary */}
                                            <ItemsSummaryBox>
                                                <div className="title">
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{
                                                            fontSize: '16px',
                                                            color: '#006e2d',
                                                        }}
                                                    >
                                                        shopping_bag
                                                    </span>
                                                    <span>{itemCount} items in basket:</span>
                                                </div>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        lineHeight: 1.4,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {itemSummary || 'Grocery essentials'}
                                                </p>
                                            </ItemsSummaryBox>

                                            {/* Total Financial Row */}
                                            <OrderFinancialRow>
                                                <div>
                                                    <span className="lbl">Total Amount</span>
                                                    <div className="amt-row">
                                                        <span className="total">
                                                            ₹{order.total_amount}
                                                        </span>
                                                        <span className="pay-tag">
                                                            {order.payment_method === 'COD'
                                                                ? 'Cash on Delivery'
                                                                : order.payment_method}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span
                                                    style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: '#8f7069',
                                                    }}
                                                >
                                                    {order.order_number}
                                                </span>
                                            </OrderFinancialRow>

                                            {/* CTAs */}
                                            <ActionsGrid>
                                                <SecondaryBtn to={`/orders/${order.id}`}>
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        support_agent
                                                    </span>
                                                    <span>Help</span>
                                                </SecondaryBtn>
                                                <PrimaryTrackBtn to={`/orders/${order.id}`}>
                                                    <span>
                                                        {isPickup
                                                            ? 'View Code & QR'
                                                            : 'Track Progress'}
                                                    </span>
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        arrow_forward
                                                    </span>
                                                </PrimaryTrackBtn>
                                            </ActionsGrid>
                                        </OrderCard>
                                    );
                                })}
                            </ActiveOrdersGrid>
                        </div>
                    )}

                    {/* SECTION 2: Past Orders */}
                    {!ordersQuery.isLoading && pastList.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <SectionHeaderRow>
                                <SectionTitleRow>
                                    <span
                                        className="material-symbols-outlined icon"
                                        style={{ color: '#5b403a' }}
                                    >
                                        history
                                    </span>
                                    <h2>Past Orders</h2>
                                </SectionTitleRow>
                                <SectionPillBadge $variant="neutral">
                                    {pastList.length} Orders
                                </SectionPillBadge>
                            </SectionHeaderRow>

                            <PastOrdersList>
                                {pastList.map((order) => {
                                    const itemCount =
                                        order.items?.reduce(
                                            (sum, i) => sum + Number(i.quantity || 1),
                                            0,
                                        ) ||
                                        order.items?.length ||
                                        1;
                                    const itemSummary = order.items
                                        ?.map((i) => `${i.product_name_snapshot} (${i.quantity})`)
                                        .join(', ');

                                    return (
                                        <PastOrderCard key={order.id}>
                                            <PastOrderTop>
                                                <div>
                                                    <h3>{order.store_name_snapshot}</h3>
                                                    <p className="date">
                                                        {formatOrderDate(
                                                            order.placed_at || order.created_at,
                                                        )}{' '}
                                                        •{' '}
                                                        <span
                                                            style={{
                                                                fontFamily: 'monospace',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {order.order_number}
                                                        </span>
                                                    </p>
                                                </div>
                                                <StatusPill $status={order.status}>
                                                    {formatStatusLabel(order.status)}
                                                </StatusPill>
                                            </PastOrderTop>

                                            <PastOrderItemsRow>
                                                <p className="items">
                                                    <strong>{itemCount} items:</strong>{' '}
                                                    {itemSummary || 'Grocery essentials'}
                                                </p>
                                                <span className="price">₹{order.total_amount}</span>
                                            </PastOrderItemsRow>

                                            <PastOrderActionsRow>
                                                <TextActionLink to={`/orders/${order.id}`}>
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        receipt_long
                                                    </span>
                                                    <span>View Invoice / Bill</span>
                                                </TextActionLink>
                                                <ReorderPill to="/">
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        refresh
                                                    </span>
                                                    <span>Reorder</span>
                                                </ReorderPill>
                                            </PastOrderActionsRow>
                                        </PastOrderCard>
                                    );
                                })}
                            </PastOrdersList>
                        </div>
                    )}

                    {/* Customer Assurance Guarantee Banner */}
                    <GuaranteeCard>
                        <div className="icon">
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                            >
                                verified_user
                            </span>
                        </div>
                        <div>
                            <p className="title">100% Quality &amp; Freshness Guarantee</p>
                            <p className="sub">
                                Any item missing, incorrect or damaged? Instant refund to UPI within
                                2 minutes or quick replacement from Badarpur mandi.
                            </p>
                        </div>
                    </GuaranteeCard>
                </ContentPanel>
            </MainCanvas>

            {/* Mobile Floating Bottom Nav Bar */}
            <FloatingBottomNav>
                <nav>
                    <NavTab to="/">
                        <span className="material-symbols-outlined icon">home</span>
                    </NavTab>
                    <NavTab to="/">
                        <span className="material-symbols-outlined icon">storefront</span>
                    </NavTab>
                    <NavTab to="/orders" $active>
                        <span
                            className="material-symbols-outlined icon"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            receipt_long
                        </span>
                        <span>Orders</span>
                    </NavTab>
                    <NavTab to="/checkout">
                        <span className="material-symbols-outlined icon">shopping_cart</span>
                    </NavTab>
                    <NavTab to="/login">
                        <span className="material-symbols-outlined icon">person</span>
                    </NavTab>
                </nav>
            </FloatingBottomNav>

            {/* Canonical Desktop Footer */}
            <Footer>
                <FooterInner>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <BrandTitle>Dropzo</BrandTitle>
                            <p
                                style={{
                                    color: '#5b403a',
                                    fontSize: '0.875rem',
                                    margin: '0.25rem 0 0',
                                }}
                            >
                                Hyperlocal Grocery Delivery in Badarpur, Karimganj, Assam
                            </p>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                gap: '1.5rem',
                                fontSize: '0.875rem',
                                color: '#5b403a',
                            }}
                        >
                            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                                Stores
                            </Link>
                            <Link to="/orders" style={{ color: 'inherit', textDecoration: 'none' }}>
                                Orders
                            </Link>
                            <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
                                Partner Portal
                            </Link>
                        </div>
                    </div>
                </FooterInner>
            </Footer>
        </PageContainer>
    );
}
