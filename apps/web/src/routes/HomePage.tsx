import { useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { media } from '../theme';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
`;

// --- Desktop Top Sticky Header ---
const DesktopHeader = styled.header`
    display: none;

    ${media.desktop} {
        display: block;
        position: sticky;
        top: 0;
        z-index: 40;
        background: #ffffff;
        border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
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

const DesktopBrandRow = styled.div`
    display: flex;
    align-items: center;
    gap: 1.5rem;
`;

const BrandLink = styled(Link)`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    color: inherit;
`;

const BrandIcon = styled.div`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.3);
    transition: transform 0.2s;

    ${BrandLink}:hover & {
        transform: scale(1.05);
    }
`;

const BrandHeading = styled.h1`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.02em;
    margin: 0;
`;

const LocationButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
`;

const LocationTextCol = styled.div`
    display: flex;
    flex-direction: column;
`;

const LocationSub = styled.span`
    font-size: 0.6875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 0.125rem;
`;

const LocationMain = styled.span`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 170px;
`;

const LocationBadge = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    background: rgba(124, 249, 148, 0.4);
    color: #007230;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    margin-left: 0.25rem;
`;

const DesktopSearchBar = styled.div`
    flex: 1;
    max-width: 32rem;
    margin: 0 0.5rem;
    position: relative;
    display: flex;
    align-items: center;
`;

const DesktopSearchInput = styled.input`
    width: 100%;
    padding: 0.625rem 3.5rem 0.625rem 2.625rem;
    border-radius: 9999px;
    border: 1px solid transparent;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;

    &:focus {
        background: #ffffff;
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 2px rgba(255, 87, 51, 0.2);
    }
`;

const DesktopSearchIcon = styled.span`
    position: absolute;
    left: 0.875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    pointer-events: none;
`;

const DesktopKbdBadge = styled.kbd`
    position: absolute;
    right: 0.875rem;
    padding: 0.125rem 0.375rem;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
    border-radius: 0.25rem;
    font-size: 0.6875rem;
    font-family: inherit;
    font-weight: 600;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const DesktopControls = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const FulfillmentToggle = styled.div`
    display: flex;
    align-items: center;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.25rem;
    border-radius: 9999px;
    font-size: 0.75rem;
`;

const FulfillmentButton = styled.button<{ $active: boolean }>`
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    transition: all 0.2s;

    ${({ $active, theme }) =>
        $active
            ? `
        background: #ffffff;
        color: ${theme.colors.rust};
        font-weight: 700;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `
            : `
        background: transparent;
        color: ${theme.colors.textSecondary};
        font-weight: 600;
        &:hover {
            color: ${theme.colors.textPrimary};
        }
    `}
`;

const CartButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    border-radius: 9999px;
    border: none;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.25);
    transition: all 0.2s;

    &:hover {
        background: ${({ theme }) => theme.colors.rust};
        transform: translateY(-1px);
    }
`;

const SignInLink = styled(Link)`
    padding: 0.4375rem 1rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.rust};
    color: ${({ theme }) => theme.colors.rust};
    text-decoration: none;
    font-size: 0.75rem;
    font-weight: 700;
    transition: background 0.2s;

    &:hover {
        background: rgba(255, 218, 211, 0.3);
    }
`;

const UserAvatarBtn = styled(Link)`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: inherit;
    padding-left: 0.25rem;
`;

const AvatarCircle = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: #ffdad3;
    color: ${({ theme }) => theme.colors.rust};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px rgba(255, 87, 51, 0.2);
`;

const DesktopCategoryBar = styled.nav`
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainer};
`;

const DesktopCategoryBarInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    padding: 0.5rem 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    overflow-x: auto;
    font-size: 0.75rem;
    font-weight: 700;
`;

const CategoryNavLink = styled.span<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    padding-bottom: 0.25rem;
    color: ${({ $active, theme }) => ($active ? theme.colors.rust : theme.colors.textSecondary)};
    border-bottom: 2px solid
        ${({ $active, theme }) => ($active ? theme.colors.rust : 'transparent')};
    transition: color 0.2s;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

// --- Mobile Header / Top Bar ---
const MobileTopContainer = styled.div`
    padding: 0.75rem 1rem 0.25rem;

    ${media.desktop} {
        display: none;
    }
`;

const MobileDeliverBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const MobileLocationGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
`;

const MobileLocationIcon = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background: #ffdad3;
    color: ${({ theme }) => theme.colors.rust};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const MobileAppBar = styled.div`
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(227, 225, 236, 0.6);
    padding: 0.5rem 0.875rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    margin-bottom: 0.75rem;
`;

const MobileSearchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
`;

const MobileSearchInputWrapper = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid rgba(228, 190, 182, 0.5);
    border-radius: 1rem;
    padding: 0.5rem 0.75rem;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
`;

const MobileSearchInput = styled.input`
    width: 100%;
    border: none;
    background: transparent;
    padding: 0;
    margin-left: 0.5rem;
    font-size: 0.875rem;
    outline: none;
    color: ${({ theme }) => theme.colors.textPrimary};

    &::placeholder {
        color: ${({ theme }) => theme.colors.textSecondary};
        opacity: 0.7;
    }
`;

const FilterIconButton = styled.button`
    width: 2.75rem;
    height: 2.75rem;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    border-radius: 1rem;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.25);
    flex-shrink: 0;
    transition: transform 0.15s;

    &:active {
        transform: scale(0.95);
    }
`;

const MobileFulfillmentToggle = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.25rem;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
`;

// --- Main Content Area ---
const MainContent = styled.main`
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 0.75rem 1rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    ${media.desktop} {
        padding: 1.5rem 2rem 3rem;
        gap: 2rem;
    }
`;

// Categories Section
const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
`;

const SectionTitle = styled.h2`
    font-size: 1.125rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;

    ${media.desktop} {
        font-size: 1.25rem;
    }
`;

const SectionSubtitle = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.125rem 0 0;
`;

const ViewAllLink = styled.span`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.rust};
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }
`;

const CategoryRail = styled.div`
    display: flex;
    gap: 0.875rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const CategoryItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
        transform: translateY(-2px);
    }
`;

const CategoryImageBox = styled.div<{ $bg: string; $border: string }>`
    width: 4.25rem;
    height: 4.25rem;
    border-radius: 1.125rem;
    background: ${({ $bg }) => $bg};
    border: 1px solid ${({ $border }) => $border};
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
`;

const CategoryImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

const CategoryLabel = styled.span`
    font-size: 0.6875rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

// Hero Promo Banner
const PromoBanner = styled.div`
    position: relative;
    overflow: hidden;
    border-radius: 1.5rem;
    background: linear-gradient(135deg, #006e2d 0%, #34a853 100%);
    color: #ffffff;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 4px 12px rgba(0, 110, 45, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;

    ${media.desktop} {
        padding: 2rem 2.5rem;
    }
`;

const PromoContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    z-index: 10;
    max-width: 65%;
`;

const PromoTag = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(4px);
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #ffffff;
    width: fit-content;
`;

const PromoHeading = styled.h3`
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.3;
    color: #ffffff;
    margin: 0;

    ${media.desktop} {
        font-size: 1.375rem;
    }
`;

const PromoButton = styled.button`
    background: #ffffff;
    color: #006e2d;
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    width: fit-content;
    transition: all 0.2s;

    &:hover {
        background: #fbf8ff;
        transform: translateY(-1px);
    }
`;

const PromoImage = styled.img`
    position: absolute;
    right: -0.5rem;
    bottom: -0.5rem;
    width: 8rem;
    height: 8rem;
    object-fit: contain;
    pointer-events: none;

    ${media.desktop} {
        width: 10rem;
        height: 10rem;
    }
`;

// Popular Stores Section
const StoresGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;

    ${media.tablet} {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const StoreCardLink = styled(Link)`
    background: #ffffff;
    border: 1px solid rgba(228, 190, 182, 0.4);
    border-radius: 1rem;
    padding: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.875rem;
    text-decoration: none;
    color: inherit;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    transition: all 0.2s;

    &:hover {
        border-color: rgba(255, 87, 51, 0.5);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        transform: translateY(-1px);
    }
`;

const StoreIconBox = styled.div`
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    background: rgba(255, 218, 211, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.rust};
    flex-shrink: 0;
    transition: transform 0.2s;

    ${StoreCardLink}:hover & {
        transform: scale(1.05);
    }
`;

const StoreInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const StoreTitleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const StoreName = styled.h4`
    font-size: 0.875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;

    ${StoreCardLink}:hover & {
        color: ${({ theme }) => theme.colors.rust};
    }
`;

const RatingBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    background: #f4f2fd;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
`;

const StoreAddress = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0.125rem 0 0;
`;

const StoreTagsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.375rem;
`;

const StoreTag = styled.span<{ $type?: 'fast' | 'default' | 'open' }>`
    font-size: 0.625rem;
    font-weight: 700;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;

    ${({ $type }) => {
        if ($type === 'fast') return 'background: rgba(124, 249, 148, 0.4); color: #007230;';
        if ($type === 'open') return 'color: #006e2d; margin-left: auto;';
        return 'background: #eeedf7; color: #5b403a;';
    }}
`;

// Daily Essentials Products Section
const ProductsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.875rem;

    ${media.tablet} {
        grid-template-columns: repeat(3, 1fr);
    }

    ${media.desktop} {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const ProductCard = styled.div`
    background: #ffffff;
    border: 1px solid rgba(228, 190, 182, 0.4);
    border-radius: 1rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    transition: all 0.2s;

    &:hover {
        border-color: rgba(255, 87, 51, 0.4);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
`;

const ProductTopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.25rem;
`;

const DiscountBadge = styled.span<{ $bg: string; $color: string }>`
    font-size: 0.625rem;
    font-weight: 800;
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
`;

const WishlistButton = styled.button`
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.border};

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

const ProductImageWrapper = styled.div`
    height: 7rem;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    margin: 0.25rem 0;
`;

const ProductImg = styled.img`
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
    transition: transform 0.2s;

    ${ProductCard}:hover & {
        transform: scale(1.05);
    }
`;

const ProductPackSize = styled.span`
    font-size: 0.6875rem;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.border};
`;

const ProductTitle = styled.h3`
    font-size: 0.75rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0.125rem 0;
`;

const ProductPriceRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
    padding-top: 0.25rem;
`;

const PriceGroup = styled.div`
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
`;

const PriceMain = styled.span`
    font-size: 0.875rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const PriceMrp = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.border};
    text-decoration: line-through;
`;

const AddButton = styled.button`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.25);
    transition: transform 0.1s;

    &:active {
        transform: scale(0.9);
    }
`;

const StepperControl = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    box-shadow: 0 2px 4px rgba(255, 87, 51, 0.25);

    button {
        border: none;
        background: transparent;
        color: #ffffff;
        cursor: pointer;
        font-weight: 700;
        padding: 0 0.25rem;

        &:active {
            transform: scale(0.9);
        }
    }
`;

// Community Assurance Banner
const AssuranceCard = styled.div`
    background: #f4f2fd;
    border: 1px solid rgba(228, 190, 182, 0.4);
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const AssuranceIconCircle = styled.div`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background: rgba(124, 249, 148, 0.4);
    color: #006e2d;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

// Mobile Floating Bottom Navigation
const MobileBottomNav = styled.nav`
    position: fixed;
    bottom: 0.75rem;
    left: 1rem;
    right: 1rem;
    max-width: 28rem;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(228, 190, 182, 0.4);
    border-radius: 9999px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
    z-index: 50;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0.375rem 0.5rem;

    ${media.desktop} {
        display: none;
    }
`;

const NavTab = styled(Link)<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    text-decoration: none;
    border-radius: 9999px;
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 700;
    transition: all 0.2s;

    ${({ $active, theme }) =>
        $active
            ? `
        background: ${theme.colors.rust};
        color: #ffffff;
        box-shadow: 0 1px 3px rgba(183, 35, 1, 0.3);
    `
            : `
        color: ${theme.colors.textSecondary};
        padding: 0.5rem;
        &:hover {
            color: ${theme.colors.textPrimary};
        }
    `}
`;

const NavButton = styled.button<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 9999px;
    padding: 0.5rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    position: relative;
    transition: color 0.2s;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const CartBadge = styled.span`
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1rem;
    height: 1rem;
    background: ${({ theme }) => theme.colors.rust};
    color: #ffffff;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

// ==================== DATA DEFINITIONS ====================

interface PublicStoreItem {
    id: string;
    name: string;
    address: string;
    is_open: boolean;
    rating?: number;
    distance?: string;
}

const FALLBACK_STORES: PublicStoreItem[] = [
    {
        id: 'store-1',
        name: 'Maa Tara Groceries',
        address: 'Station Road, Badarpur • 500m away',
        is_open: true,
        rating: 4.8,
        distance: '500m away',
    },
    {
        id: 'store-2',
        name: 'Bismillah Daily Fresh',
        address: 'Market Complex, Main Chowk • 750m away',
        is_open: true,
        rating: 4.9,
        distance: '750m away',
    },
];

interface ProductItem {
    id: string;
    name: string;
    packSize: string;
    price: number;
    mrp?: number;
    badge: string;
    badgeBg: string;
    badgeColor: string;
    image: string;
}

const DAILY_ESSENTIALS: ProductItem[] = [
    {
        id: 'prod-1',
        name: 'Fresh Strawberry',
        packSize: '500g box',
        price: 120,
        mrp: 150,
        badge: 'BEST SALE',
        badgeBg: 'rgba(50, 152, 220, 0.2)',
        badgeColor: '#006398',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5rg2b5RR4kyLwHKi633w_j_fVf3dbNATIXCDnQavW3iSyOn4BZ0yyU3S8xU2n1Mf_dEobkJToPeL9hbUnpGIKyEB48H1znoh2GVOf17HhXGwKMGPHa2h-WmXYzOVztu4LjVOULnjGMDOsY7ZmeIIk3yWXSz196E1bROo2hTrqcHzAk-7_EfkvgGmQQXz7gkBJNciihYXqB3nNqeCHnLX0Ixqb51hI7pUEClbmU8w',
    },
    {
        id: 'prod-2',
        name: 'Hass Avocado',
        packSize: '2 pcs pack',
        price: 80,
        mrp: 95,
        badge: '8% OFF',
        badgeBg: '#FFDAD3',
        badgeColor: '#B72301',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAadwl4SlD0LbErZay3yUQF61E9Ii_vreyjyFdYIzZehRyuWS_a0cjyG7SEbhqYY0zp3TLUuFZuKg7_3_C5efenbopYhrwWWAZqpba2M2BYFo273YZZR5OZ6OVNl_L68kJiGgOXuIPhWjNHUwcM43l55x4ds3P2e_kdkNxm-zEORJ9RlGH__T7DotzX_hLyGD0bCznP8BhUGrpwTZpVOOKDoBl0oKIJLL3GMguCUvY',
    },
    {
        id: 'prod-3',
        name: 'Shudh Chakki Atta',
        packSize: '5 kg',
        price: 210,
        mrp: 240,
        badge: 'ESSENTIAL',
        badgeBg: 'rgba(124, 249, 148, 0.4)',
        badgeColor: '#007230',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEIGRBr9wBq28jmm2etlmX-J4xQ6RP_fBlq4RSUXjA69Qx4zjzlWKy0E_U7PyufXihsC_3lGVP_W8ViS-YMQReiJaO9WMMQcd9EDIIHWDOhYrdhK6wgO9yRHMZODpKRj_M9qBYAwOuPjGvcbe1w-0B-7NS3YswqaIgx7MhWX1KvcVHtzi1Om1c-M30BYveRI3yK-9GLTxR_dOVsmMpig7pnDkySWqCWLEUfxNE6IE',
    },
    {
        id: 'prod-4',
        name: 'Taaza Fresh Milk',
        packSize: '500 ml',
        price: 32,
        badge: 'DAILY FRESH',
        badgeBg: '#EEEDF7',
        badgeColor: '#5B403A',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJYedS_CoqtnVL-EYWE-H2pBv9Tr-1xM8bACPJcKGXZmlSNCQMqedOQJN3u7dU6VZ1XP0Zfhp9_sBiG8t---jAP55f0-EaiGRaiuTC-bNzD040BP7jCGmfMTCNoXYsow2a-zyIFB5rDYME10TVFrde2SqsstNPVAGbXqG3BDvKSOMHoINoGc-5S83UfNE-jZLrDUqUKqYEe-4n_Va8mCC9ZVroNVOmajdY62dZ-68',
    },
];

// ==================== COMPONENT ====================

export function HomePage() {
    const navigate = useNavigate();
    const tokens = useAuthStore((state) => state.tokens);
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = Boolean(tokens?.accessToken);

    const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');
    const [searchQuery, setSearchQuery] = useState('');
    const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({ 'prod-4': 1 });

    const storesQuery = useQuery({
        queryKey: ['public-stores'],
        queryFn: () => apiClient.listPublicStores(),
        staleTime: 60_000,
    });

    const stores: PublicStoreItem[] =
        storesQuery.data && storesQuery.data.data && storesQuery.data.data.length > 0
            ? storesQuery.data.data.map((s, idx) => ({
                  id: s.id,
                  name: s.name,
                  address: s.address,
                  is_open: s.is_open,
                  rating: idx % 2 === 0 ? 4.8 : 4.9,
                  distance: `${450 + idx * 250}m away`,
              }))
            : FALLBACK_STORES;

    const handleQuantityChange = (productId: string, delta: number) => {
        setCartQuantities((prev) => {
            const current = prev[productId] ?? 0;
            const updated = Math.max(0, current + delta);
            if (updated === 0) {
                const copy = { ...prev };
                delete copy[productId];
                return copy;
            }
            return { ...prev, [productId]: updated };
        });
    };

    const totalCartCount = Object.values(cartQuantities).reduce((acc, q) => acc + q, 0);

    const handleProtectedNavigation = (path: string) => {
        if (!isAuthenticated) {
            navigate(`/login?redirect=${encodeURIComponent(path)}`);
        } else {
            navigate(path);
        }
    };

    return (
        <PageContainer>
            {/* ================= DESKTOP STICKY HEADER ================= */}
            <DesktopHeader>
                <DesktopHeaderInner>
                    <DesktopBrandRow>
                        <BrandLink to="/">
                            <BrandIcon>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '24px' }}
                                >
                                    electric_bolt
                                </span>
                            </BrandIcon>
                            <BrandHeading>Dropzo</BrandHeading>
                        </BrandLink>

                        <LocationButton type="button">
                            <span
                                className="material-symbols-outlined"
                                style={{ color: '#B72301', fontSize: '20px' }}
                            >
                                location_on
                            </span>
                            <LocationTextCol>
                                <LocationSub>
                                    Delivering to{' '}
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '12px' }}
                                    >
                                        keyboard_arrow_down
                                    </span>
                                </LocationSub>
                                <LocationMain>Badarpur Main Town</LocationMain>
                            </LocationTextCol>
                            <LocationBadge>15 mins</LocationBadge>
                        </LocationButton>
                    </DesktopBrandRow>

                    <DesktopSearchBar>
                        <DesktopSearchIcon className="material-symbols-outlined">
                            search
                        </DesktopSearchIcon>
                        <DesktopSearchInput
                            type="text"
                            placeholder="Search fresh veggies, milk, Badarpur local pantry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <DesktopKbdBadge>⌘K</DesktopKbdBadge>
                    </DesktopSearchBar>

                    <DesktopControls>
                        <FulfillmentToggle>
                            <FulfillmentButton
                                type="button"
                                $active={fulfillmentMode === 'delivery'}
                                onClick={() => setFulfillmentMode('delivery')}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px' }}
                                >
                                    moped
                                </span>
                                Express Delivery
                            </FulfillmentButton>
                            <FulfillmentButton
                                type="button"
                                $active={fulfillmentMode === 'pickup'}
                                onClick={() => setFulfillmentMode('pickup')}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px' }}
                                >
                                    storefront
                                </span>
                                Store Pickup
                            </FulfillmentButton>
                        </FulfillmentToggle>

                        <CartButton
                            type="button"
                            onClick={() => handleProtectedNavigation('/checkout')}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                            >
                                shopping_cart
                            </span>
                            <span>Cart ({totalCartCount})</span>
                        </CartButton>

                        {!isAuthenticated ? (
                            <SignInLink to="/login">Sign In</SignInLink>
                        ) : (
                            <UserAvatarBtn to="/orders">
                                <span
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        maxWidth: '120px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {user?.phone ? `+91 ${user.phone}` : 'Customer'}
                                </span>
                                <AvatarCircle>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        person
                                    </span>
                                </AvatarCircle>
                            </UserAvatarBtn>
                        )}
                    </DesktopControls>
                </DesktopHeaderInner>

                <DesktopCategoryBar>
                    <DesktopCategoryBarInner>
                        <CategoryNavLink $active>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                local_florist
                            </span>
                            Vegetables & Produce
                        </CategoryNavLink>
                        <CategoryNavLink>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                egg
                            </span>
                            Dairy & Bread
                        </CategoryNavLink>
                        <CategoryNavLink>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                rice_bowl
                            </span>
                            Local Pantry & Groceries
                        </CategoryNavLink>
                        <CategoryNavLink>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                cookie
                            </span>
                            Snacks
                        </CategoryNavLink>
                    </DesktopCategoryBarInner>
                </DesktopCategoryBar>
            </DesktopHeader>

            {/* ================= MOBILE HEADER ================= */}
            <MobileTopContainer>
                <MobileDeliverBar>
                    <MobileLocationGroup>
                        <MobileLocationIcon>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}
                            >
                                location_on
                            </span>
                        </MobileLocationIcon>
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    color: '#8F7069',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Delivering to
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '14px' }}
                                >
                                    expand_more
                                </span>
                            </div>
                            <p
                                style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    margin: 0,
                                }}
                            >
                                Badarpur Main Town, Sribhumi
                            </p>
                        </div>
                    </MobileLocationGroup>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            background: 'rgba(124, 249, 148, 0.4)',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '9999px',
                            border: '1px solid rgba(0, 110, 45, 0.2)',
                        }}
                    >
                        <span
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '9999px',
                                background: '#006E2D',
                            }}
                        />
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#007230' }}>
                            15-30 min
                        </span>
                    </div>
                </MobileDeliverBar>

                <MobileAppBar>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                            style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '9999px',
                                background: '#E8E7F1',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {isAuthenticated ? (
                                <img
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVvjvSv9tmha3tkenw60T-oLTPmxoBG4Ec7oHGAj8w5voX7I3eYhswojrAu3qY1uJPC4UMTtX1I2pzDJHSvM-S2-1-B03AG--chhRlzRLKXdMnZevdSS7ZHzZypsnWnIBDkv9gtNu13Jlc777A2bQaYS6TXCxKFVZToEIxsVUvzpLFERnSt-GRwOKQyTU64WuxkDRZvC42ci2_3trJ0jxPkawUccxut-dWdOmJGok"
                                    alt="User avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <span
                                    className="material-symbols-outlined"
                                    style={{ color: '#B72301', fontSize: '24px' }}
                                >
                                    person
                                </span>
                            )}
                        </div>
                        <div>
                            {isAuthenticated ? (
                                <>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            color: '#5B403A',
                                            display: 'block',
                                        }}
                                    >
                                        Welcome Back
                                    </span>
                                    <h2
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {user?.phone ? `+91 ${user.phone}` : 'Cameron Williamson'}
                                    </h2>
                                </>
                            ) : (
                                <>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            color: '#5B403A',
                                            display: 'block',
                                        }}
                                    >
                                        Welcome to
                                    </span>
                                    <h1
                                        style={{
                                            fontSize: '1.125rem',
                                            fontWeight: 800,
                                            margin: 0,
                                            lineHeight: 1.2,
                                            color: '#B72301',
                                        }}
                                    >
                                        Dropzo
                                    </h1>
                                </>
                            )}
                        </div>
                    </div>

                    {!isAuthenticated ? (
                        <Link
                            to="/login"
                            style={{
                                padding: '0.375rem 0.875rem',
                                borderRadius: '9999px',
                                background: '#B72301',
                                color: '#ffffff',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            Sign In
                        </Link>
                    ) : (
                        <button
                            type="button"
                            aria-label="Notifications"
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                borderRadius: '9999px',
                                background: '#EEEDF7',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '20px' }}
                            >
                                notifications
                            </span>
                        </button>
                    )}
                </MobileAppBar>

                <MobileSearchRow>
                    <MobileSearchInputWrapper>
                        <span
                            className="material-symbols-outlined"
                            style={{ color: '#5B403A', fontSize: '20px' }}
                        >
                            search
                        </span>
                        <MobileSearchInput
                            type="text"
                            placeholder="Search fresh vegetables, rice, dairy..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </MobileSearchInputWrapper>
                    <FilterIconButton type="button" aria-label="Filters">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            tune
                        </span>
                    </FilterIconButton>
                </MobileSearchRow>

                <MobileFulfillmentToggle>
                    <FulfillmentButton
                        type="button"
                        $active={fulfillmentMode === 'delivery'}
                        onClick={() => setFulfillmentMode('delivery')}
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontSize: '16px',
                                fontVariationSettings:
                                    fulfillmentMode === 'delivery' ? "'FILL' 1" : "'FILL' 0",
                            }}
                        >
                            electric_moped
                        </span>
                        Express Delivery
                    </FulfillmentButton>
                    <FulfillmentButton
                        type="button"
                        $active={fulfillmentMode === 'pickup'}
                        onClick={() => setFulfillmentMode('pickup')}
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontSize: '16px',
                                fontVariationSettings:
                                    fulfillmentMode === 'pickup' ? "'FILL' 1" : "'FILL' 0",
                            }}
                        >
                            storefront
                        </span>
                        Store Pickup
                    </FulfillmentButton>
                </MobileFulfillmentToggle>
            </MobileTopContainer>

            {/* ================= MAIN CONTENT ================= */}
            <MainContent>
                {/* Categories Section */}
                <section>
                    <SectionHeader>
                        <SectionTitle>Explore Categories</SectionTitle>
                        <ViewAllLink>View All</ViewAllLink>
                    </SectionHeader>
                    <CategoryRail>
                        <CategoryItem>
                            <CategoryImageBox
                                $bg="rgba(124, 249, 148, 0.3)"
                                $border="rgba(124, 249, 148, 0.5)"
                            >
                                <CategoryImage
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9giK0gJDfoosf_lVqAMFbXCIADGUPiFEa243vhaldlMArs-luBs0Ntbexlvp7-mucb3Gk8z7JPTNOZWSFsmC9hadSobZb1qQpWQk7jizaUlIDBCWiduF-JT8cHdrfSpuinjDo7wvswXchWlSyR6K5KceUVWPiaGDtbvIxf04lBc-TB9ZDQenKVB6An1-erlk8zvFwAV4laE6KLT0rFcVwe81-RuspIeAOH-sMK3Q"
                                    alt="Vegetables"
                                />
                            </CategoryImageBox>
                            <CategoryLabel>Vegetables</CategoryLabel>
                        </CategoryItem>

                        <CategoryItem>
                            <CategoryImageBox $bg="rgba(255, 218, 211, 0.4)" $border="#FFDAD3">
                                <CategoryImage
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMGICRVqG1py2HE7zYietEpb0h93m2Q_xiTW_yEvGbFmDE6X8zVe8lddOBSdn8yyXdRvDuOTcsvRpitk5XPtaoJuJL46jN8zsIzpmBwAw617taQrWc1_WMPPE8nenGQ50gZbYKtaSdut_RTbHb51y7Q93RWHH9b9BntYSE0rq6XCaQhnEWRN6fp8dvTrGDkBwVztIdcpbWZa3jSRd2lh6r_PI0m_dJG58SBlGyJmg"
                                    alt="Soft Fruits"
                                />
                            </CategoryImageBox>
                            <CategoryLabel>Soft Fruits</CategoryLabel>
                        </CategoryItem>

                        <CategoryItem>
                            <CategoryImageBox $bg="#E8E7F1" $border="rgba(228, 190, 182, 0.4)">
                                <CategoryImage
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUoMg6ZSBHVXFFqSStbJ82QeQm3WSnrW_plwV7BHymyM7blzcdpL6lthhzySfR5_rlybpeE2TO6INo34q7QWOrVkdJhiNEJnZ-avwvHdnixleTfEqgpFinw1I1xdJic_HXjl6grJX5R-H8OI2xi3MwK1u_C3kOEIXstsabbtiZA2jXAdaTSdAign02u-595wom-3AFoNbe_MKfEa9jmh3F5bXyRqpugQEj7GaVm9s"
                                    alt="Dairy & Bread"
                                />
                            </CategoryImageBox>
                            <CategoryLabel>Dairy &amp; Bread</CategoryLabel>
                        </CategoryItem>

                        <CategoryItem>
                            <CategoryImageBox $bg="rgba(204, 229, 255, 0.4)" $border="#CCE5FF">
                                <CategoryImage
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAfgCEYlhKqRzlNOWdoNiMFPtQY8dam5HaMxxu0Y3zFuNygHJEiyoLRuIhgfkrMlUmsLxb4Lp-msQE66h9fANQLWhC3Xgwf1qYIKGDCYyBn6GC4s7yuwzCDRrh1uMiDvBEcXfEMYLthh7hPITyrtxLXrQRUMyhbT2-K2jreueq4zVwTgbZLGonrU6OjRKy8odwGUpPDEk-06G6cfcUPZ0tI7CX-LreDO3MxuHot0No"
                                    alt="Groceries"
                                />
                            </CategoryImageBox>
                            <CategoryLabel>Groceries</CategoryLabel>
                        </CategoryItem>

                        <CategoryItem>
                            <CategoryImageBox $bg="#E8E7F1" $border="rgba(228, 190, 182, 0.4)">
                                <CategoryImage
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8b44xvd87PQ9iZ1IHvcMnoaQFygWBP8BoswPUbpbbrncHcYyeDMUZubJdIP-nbU02uHo5Vy5x5lz98zcTmAA4W8DR34XH51c7MkKEGx_cZ0U313YCyDRSMQy7vCB5usLZS3rI316z06CioTRI3reYny97A7pzqQDJPJIwbijIaLn14z6NAedInlqK4YBdmYBX-ZzHpaCeJEG0SW0kbMJkvy1TJjfcEIgIOrh_FDo"
                                    alt="Snacks"
                                />
                            </CategoryImageBox>
                            <CategoryLabel>Snacks</CategoryLabel>
                        </CategoryItem>
                    </CategoryRail>
                </section>

                {/* Hero Promo Banner */}
                <PromoBanner>
                    <PromoContent>
                        <PromoTag>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1", fontSize: '13px' }}
                            >
                                eco
                            </span>
                            100% Farm Fresh
                        </PromoTag>
                        <PromoHeading>Fresh foods everyday and our best service</PromoHeading>
                        <PromoButton type="button">Grab Voucher</PromoButton>
                    </PromoContent>
                    <PromoImage
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1SgejS92AKJ_QYTzW21s_SuSgyVHmp-lX1wW1T0m0hW1Jzap7vaDjXjvxynR10pS3AXZEhcPt9nSnnmCGKOqsw5nHKdqacyGggN8DdYo_Bchp9sxUgc0-4BxCP4tEEeEhZzrHQsXyWFYY0jNw9tkwRWXXvGmSlTI5XSMwZevvQoP6Aug5h90YAenupuzQfMIhDZwboqRME6Chwrc-aPzA86pMfg3tHRA8kMfA8Zs"
                        alt="Farm fresh produce"
                    />
                </PromoBanner>

                {/* Popular Stores in Badarpur */}
                <section>
                    <SectionHeader>
                        <div>
                            <SectionTitle>Popular Stores in Badarpur</SectionTitle>
                            <SectionSubtitle>
                                Direct fulfillment from your neighborhood trusted shops
                            </SectionSubtitle>
                        </div>
                        <ViewAllLink>See All</ViewAllLink>
                    </SectionHeader>

                    <StoresGrid>
                        {stores.map((store) => (
                            <StoreCardLink key={store.id} to={`/stores/${store.id}`}>
                                <StoreIconBox>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '28px' }}
                                    >
                                        storefront
                                    </span>
                                </StoreIconBox>
                                <StoreInfo>
                                    <StoreTitleRow>
                                        <StoreName>{store.name}</StoreName>
                                        <RatingBadge>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{
                                                    color: '#FF5733',
                                                    fontVariationSettings: "'FILL' 1",
                                                    fontSize: '14px',
                                                }}
                                            >
                                                star
                                            </span>
                                            {store.rating ?? 4.8}
                                        </RatingBadge>
                                    </StoreTitleRow>
                                    <StoreAddress>{store.address}</StoreAddress>
                                    <StoreTagsRow>
                                        <StoreTag $type="fast">Fast Delivery</StoreTag>
                                        <StoreTag $type="default">Store Pickup</StoreTag>
                                        {store.is_open && <StoreTag $type="open">Open</StoreTag>}
                                    </StoreTagsRow>
                                </StoreInfo>
                            </StoreCardLink>
                        ))}
                    </StoresGrid>
                </section>

                {/* Daily Essentials (You Might Need) */}
                <section>
                    <SectionHeader>
                        <div>
                            <SectionTitle>You Might Need</SectionTitle>
                            <SectionSubtitle>Handpicked freshest deals in Badarpur</SectionSubtitle>
                        </div>
                        <ViewAllLink>View All</ViewAllLink>
                    </SectionHeader>

                    <ProductsGrid>
                        {DAILY_ESSENTIALS.map((prod) => {
                            const qty = cartQuantities[prod.id] ?? 0;
                            return (
                                <ProductCard key={prod.id}>
                                    <ProductTopRow>
                                        <DiscountBadge $bg={prod.badgeBg} $color={prod.badgeColor}>
                                            {prod.badge}
                                        </DiscountBadge>
                                        <WishlistButton type="button" aria-label="Wishlist">
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '16px' }}
                                            >
                                                favorite
                                            </span>
                                        </WishlistButton>
                                    </ProductTopRow>

                                    <ProductImageWrapper>
                                        <ProductImg src={prod.image} alt={prod.name} />
                                    </ProductImageWrapper>

                                    <div>
                                        <ProductPackSize>{prod.packSize}</ProductPackSize>
                                        <ProductTitle>{prod.name}</ProductTitle>

                                        <ProductPriceRow>
                                            <PriceGroup>
                                                <PriceMain>₹{prod.price}</PriceMain>
                                                {prod.mrp && <PriceMrp>₹{prod.mrp}</PriceMrp>}
                                            </PriceGroup>

                                            {qty > 0 ? (
                                                <StepperControl>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleQuantityChange(prod.id, -1)
                                                        }
                                                        aria-label="Decrease quantity"
                                                    >
                                                        -
                                                    </button>
                                                    <span>{qty}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleQuantityChange(prod.id, 1)
                                                        }
                                                        aria-label="Increase quantity"
                                                    >
                                                        +
                                                    </button>
                                                </StepperControl>
                                            ) : (
                                                <AddButton
                                                    type="button"
                                                    onClick={() => handleQuantityChange(prod.id, 1)}
                                                    aria-label={`Add ${prod.name} to cart`}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '18px' }}
                                                    >
                                                        add
                                                    </span>
                                                </AddButton>
                                            )}
                                        </ProductPriceRow>
                                    </div>
                                </ProductCard>
                            );
                        })}
                    </ProductsGrid>
                </section>

                {/* Community Assurance Card */}
                <AssuranceCard>
                    <AssuranceIconCircle>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                            verified_user
                        </span>
                    </AssuranceIconCircle>
                    <div>
                        <h4
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                margin: 0,
                                color: '#1A1B22',
                            }}
                        >
                            Local Community Assurance
                        </h4>
                        <p
                            style={{
                                fontSize: '0.75rem',
                                color: '#5B403A',
                                margin: '0.125rem 0 0',
                            }}
                        >
                            Guaranteed replacement if quality isn't fresh upon arrival in Badarpur.
                        </p>
                    </div>
                </AssuranceCard>
            </MainContent>

            {/* ================= MOBILE FLOATING BOTTOM NAV ================= */}
            <MobileBottomNav aria-label="Main Navigation">
                <NavTab to="/" $active aria-current="page">
                    <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}
                    >
                        home
                    </span>
                    <span>Home</span>
                </NavTab>

                <NavTab to="/stores/store-1" aria-label="Stores">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        storefront
                    </span>
                </NavTab>

                <NavButton
                    type="button"
                    onClick={() => handleProtectedNavigation('/orders')}
                    aria-label="Orders"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        receipt_long
                    </span>
                </NavButton>

                <NavButton
                    type="button"
                    onClick={() => handleProtectedNavigation('/checkout')}
                    aria-label="Cart"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        shopping_cart
                    </span>
                    {totalCartCount > 0 && <CartBadge>{totalCartCount}</CartBadge>}
                </NavButton>

                <NavButton
                    type="button"
                    onClick={() =>
                        handleProtectedNavigation(isAuthenticated ? '/orders' : '/login')
                    }
                    aria-label="Profile"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        person
                    </span>
                </NavButton>
            </MobileBottomNav>
        </PageContainer>
    );
}
