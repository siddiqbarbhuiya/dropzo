import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { media } from '../../theme/media';
import { useAuthStore } from '../../store/useAuthStore';
import { useCartStore, CartItem } from '../../store/useCartStore';
import { WoltModalSheet, QuantityStepper } from '../../components/ui';

// ================= TYPES =================

export interface ProductItemView {
    id: string;
    productId: string;
    productName: string;
    productDescription: string | null;
    imageUrl: string | null;
    categoryName: string;
    mrp: number;
    sellingPrice: number;
    inStock: boolean;
    lowStock: boolean;
    variantName: string | null;
    sku: string | null;
}

// ================= STYLED COMPONENTS =================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    font-family: ${({ theme }) => theme.typography.fontFamily};
    display: flex;
    flex-direction: column;
    padding-bottom: 5.5rem;

    ${media.desktop} {
        padding-bottom: 0;
    }
`;

// --- Desktop Sticky Header ---
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
    gap: 1.5rem;
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
    padding: 0.25rem;
    border-radius: 0.5rem;
    background: ${({ theme }) => theme.colors.primary};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const BrandHeading = styled.span`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.02em;
`;

const LocationButton = styled.button`
    display: none;

    ${media.desktop} {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0.875rem;
        border-radius: 9999px;
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
        border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        color: ${({ theme }) => theme.colors.textPrimary};
        cursor: pointer;
        text-align: left;
    }
`;

const SearchContainer = styled.div`
    flex: 1;
    max-width: 32rem;
    position: relative;
    display: flex;
    align-items: center;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 0.625rem 3rem 0.625rem 2.5rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.textPrimary};
    outline: none;

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        background: #ffffff;
    }
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 0.875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    pointer-events: none;
    font-size: 1.25rem;
`;

const DesktopActions = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const CartSummaryButton = styled.button`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.rust};
    color: #ffffff;
    font-weight: 700;
    font-size: 0.875rem;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    transition: opacity 0.15s;

    &:hover {
        opacity: 0.92;
    }
`;

const UserAvatar = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerHighest};
    color: ${({ theme }) => theme.colors.rust};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
`;

// --- Mobile Top App Bar ---
const MobileAppBar = styled.nav`
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(251, 248, 255, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;

    ${media.desktop} {
        display: none;
    }
`;

const MobileBackButton = styled(Link)`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 9999px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.textPrimary};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    text-decoration: none;
`;

const MobileStoreTitleGroup = styled.div`
    flex: 1;
    margin-left: 0.75rem;
    min-width: 0;
`;

const MobileStoreName = styled.h1`
    font-size: 0.9375rem;
    font-weight: 800;
    margin: 0;
    color: ${({ theme }) => theme.colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MobileStoreSubtitle = styled.span`
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.secondary};
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const MobileActionButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
`;

const MobileIconButton = styled.button`
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background: #ffffff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.textSecondary};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
`;

// --- Desktop Breadcrumb & Hub Strip ---
const BreadcrumbStrip = styled.div`
    display: none;

    ${media.desktop} {
        display: block;
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
        border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        padding: 0.5rem 2rem;
        font-size: 0.8125rem;
        color: ${({ theme }) => theme.colors.textSecondary};
    }
`;

const BreadcrumbInner = styled.div`
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

// --- Main Content ---
const MainContainer = styled.main`
    max-width: 1280px;
    margin: 0 auto;
    padding: 1rem;
    width: 100%;
    box-sizing: border-box;

    ${media.desktop} {
        padding: 1.5rem 2rem;
    }
`;

// --- Store Hero Showcase Card ---
const HeroCard = styled.section`
    background: #ffffff;
    border-radius: 1.25rem;
    padding: 1.25rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    margin-bottom: 1.5rem;
    position: relative;
    overflow: hidden;

    ${media.desktop} {
        padding: 1.75rem;
    }
`;

const HeroTopRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;

    ${media.desktop} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const StoreInfoBlock = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 1rem;
`;

const StoreThumbnail = styled.div`
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 1rem;
    overflow: hidden;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);

    ${media.desktop} {
        width: 5.5rem;
        height: 5.5rem;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const StoreDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
`;

const BadgesRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const VerifiedBadge = styled.span`
    background: #7cf994;
    color: #002109;
    font-size: 0.6875rem;
    font-weight: 800;
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
`;

const StoreHeading = styled.h1`
    font-size: 1.375rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.015em;
    color: ${({ theme }) => theme.colors.textPrimary};

    ${media.desktop} {
        font-size: 1.75rem;
    }
`;

const StoreAddress = styled.p`
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0;
`;

const RatingStatusStrip = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.75rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    margin-top: 0.75rem;
    font-size: 0.8125rem;
`;

const RatingBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #fffbeb;
    border: 1px solid #fde68a;
    padding: 0.1875rem 0.5rem;
    border-radius: 0.5rem;
    font-weight: 700;
    color: #92400e;
`;

const OpenStatusIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.secondary};
`;

const PulseDot = styled.span<{ $open: boolean }>`
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: ${({ $open }) => ($open ? '#10b981' : '#ef4444')};
`;

// --- Fulfillment Mode Toggle ---
const FulfillmentSwitcher = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding-top: 0.75rem;

    ${media.desktop} {
        display: flex;
        gap: 0.75rem;
        padding-top: 0;
    }
`;

const FulfillmentCard = styled.div<{ $active: boolean }>`
    padding: 0.625rem 0.875rem;
    border-radius: 0.875rem;
    border: 2px solid
        ${({ $active, theme }) => ($active ? theme.colors.rust : theme.colors.surfaceContainerHighest)};
    background: ${({ $active }) => ($active ? '#fff5f3' : '#ffffff')};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    transition: all 0.15s ease;

    ${media.desktop} {
        min-width: 13rem;
    }
`;

// --- Store Aisles / Sidebar Layout ---
const ContentColumns = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    ${media.desktop} {
        flex-direction: row;
        align-items: flex-start;
        gap: 2rem;
    }
`;

// Desktop Sidebar
const AislesSidebar = styled.aside`
    display: none;

    ${media.desktop} {
        display: block;
        width: 16rem;
        flex-shrink: 0;
        background: #ffffff;
        border-radius: 1rem;
        padding: 1.25rem;
        border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        position: sticky;
        top: 5rem;
    }
`;

const SidebarNav = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.75rem;
`;

const AisleTab = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.875rem;
    border-radius: 9999px;
    border: none;
    background: ${({ $active, theme }) =>
        $active ? theme.colors.surfaceContainerLow : 'transparent'};
    color: ${({ $active, theme }) => ($active ? theme.colors.secondary : theme.colors.textPrimary)};
    font-weight: ${({ $active }) => ($active ? 700 : 500)};
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

// Mobile Horizontal Category Rail
const MobileCategoryRail = styled.div`
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.25rem 0;
    margin-bottom: 1rem;
    -ms-overflow-style: none;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }

    ${media.desktop} {
        display: none;
    }
`;

const MobileCategoryChip = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    white-space: nowrap;
    padding: 0.4375rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 700;
    border: 1px solid
        ${({ $active, theme }) => ($active ? theme.colors.rust : theme.colors.surfaceContainerHighest)};
    background: ${({ $active, theme }) => ($active ? theme.colors.rust : '#ffffff')};
    color: ${({ $active }) => ($active ? '#ffffff' : 'inherit')};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
`;

// Main Catalogue Area
const CatalogueArea = styled.section`
    flex: 1;
    min-width: 0;
`;

const PromoBanner = styled.div`
    background: linear-gradient(135deg, #ffdad3 0%, #eeedf7 50%, #7ffc97 100%);
    border-radius: 1rem;
    padding: 1rem 1.25rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
`;

const SubheaderRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};

    ${media.desktop} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

// Product Grid
const ProductGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;

    ${media.desktop} {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.25rem;
    }
`;

const ProductCard = styled.article`
    background: #ffffff;
    border-radius: 1rem;
    padding: 0.875rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition:
        transform 0.15s,
        box-shadow 0.15s;

    &:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06);
    }
`;

const ProductImageFrame = styled.div`
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    position: relative;

    img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
`;

const ProductCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.375rem;
`;

const VariantTag = styled.span`
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
`;

const StockBadge = styled.span<{ $inStock: boolean }>`
    font-size: 0.6875rem;
    font-weight: 700;
    color: ${({ $inStock, theme }) => ($inStock ? theme.colors.secondary : theme.colors.rust)};
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const ProductTitle = styled.h3`
    font-size: 0.875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const ProductSubtitle = styled.p`
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.25rem 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PriceRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const PriceGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

const SellingPrice = styled.span`
    font-size: 1rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const MrpPrice = styled.span`
    font-size: 0.6875rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: line-through;
`;

// Add CTA button
const AddButton = styled.button`
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 2px solid ${({ theme }) => theme.colors.rust};
    background: #ffffff;
    color: ${({ theme }) => theme.colors.rust};
    font-size: 0.8125rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.rust};
        color: #ffffff;
    }
`;

// Quantity Stepper
const StepperContainer = styled.div`
    display: inline-flex;
    align-items: center;
    background: ${({ theme }) => theme.colors.rust};
    color: #ffffff;
    border-radius: 9999px;
    padding: 0.1875rem 0.375rem;
    gap: 0.5rem;
    font-weight: 800;
    font-size: 0.8125rem;
`;

const StepperBtn = styled.button`
    background: transparent;
    border: none;
    color: #ffffff;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 9999px;

    &:hover {
        background: rgba(0, 0, 0, 0.15);
    }
`;

// --- Floating Cart Docks ---
// Mobile Dock
const MobileFloatingCart = styled.aside`
    position: fixed;
    bottom: 5rem;
    left: 1rem;
    right: 1rem;
    z-index: 40;
    max-width: 28rem;
    margin: 0 auto;

    ${media.desktop} {
        display: none;
    }
`;

const MobileCartInner = styled.div`
    background: #2f3038;
    color: #f1effa;
    border-radius: 1rem;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

// Desktop Dock
const DesktopFloatingCart = styled.aside`
    display: none;

    ${media.desktop} {
        display: block;
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 40;
        width: 22rem;
    }
`;

const DesktopCartInner = styled.div`
    background: #ffffff;
    border-radius: 1.25rem;
    padding: 1rem 1.25rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
`;

// --- Cross-Store Conflict Modal ---
const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
`;

const ModalCard = styled.div`
    background: #ffffff;
    border-radius: 1.25rem;
    max-width: 24rem;
    width: 100%;
    padding: 1.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    text-align: center;
`;

const ModalActions = styled.div`
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
`;

const ModalButton = styled.button<{ $primary?: boolean }>`
    flex: 1;
    padding: 0.625rem 1rem;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 0.875rem;
    cursor: pointer;
    border: ${({ $primary, theme }) =>
        $primary ? 'none' : `1px solid ${theme.colors.surfaceContainerHighest}`};
    background: ${({ $primary, theme }) => ($primary ? theme.colors.rust : '#ffffff')};
    color: ${({ $primary }) => ($primary ? '#ffffff' : 'inherit')};

    &:hover {
        opacity: 0.9;
    }
`;

// --- Wolt Modal Sheet Cart Summary Styled Elements ---
const CartSheetItemList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    padding: 0.5rem 0;
`;

const CartSheetItemRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.875rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};

    &:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
`;

const CartSheetItemInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
`;

const CartSheetItemThumb = styled.div`
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const CartSheetBillCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    border-radius: 1rem;
    padding: 0.875rem 1rem;
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
`;

const CartSheetBillRow = styled.div<{ $bold?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: ${({ $bold }) => ($bold ? '0.9375rem' : '0.8125rem')};
    font-weight: ${({ $bold }) => ($bold ? 800 : 500)};
    color: ${({ $bold, theme }) => ($bold ? theme.colors.textPrimary : theme.colors.textSecondary)};
`;

// --- Curated Fallback Catalogue for Badarpur Kirana ---
const FALLBACK_PRODUCTS: ProductItemView[] = [
    {
        id: 'fallback-1',
        productId: 'prod-fortune-oil',
        productName: 'Fortune Sunlite Refined Sunflower Oil',
        productDescription: 'Refined oil fortified with Vitamin A & D',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBxH8sRUbMTD0VwbDj1ph_ZOGp2ZFWDwANYBLNd-nxzWxFPXYDLw2Cz9m8AQgDylStHPmIx5GTD2dsIAJMBa_xUwl9BeHrywuNpDmE5-paSZiHiiE6xuFCdCExGd99AYhRrFj8zZGwMWMb6BwaKu79GeAnkbgJqupNknZeJIRcH4t9ZZS7FC5ftgBrESuJMJ8zsEZVkdCTPDzTzmIca6D17YNBYOsffdXABWLoNfE8',
        categoryName: 'Cooking Oils & Ghee',
        mrp: 170,
        sellingPrice: 145,
        inStock: true,
        lowStock: false,
        variantName: '1 L Pouch',
        sku: 'OIL-SUN-1L',
    },
    {
        id: 'fallback-2',
        productId: 'prod-tata-salt',
        productName: 'Tata Salt Vacuum Evaporated',
        productDescription: 'Iodized cooking salt • Desh Ka Namak',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCfNxfV5CosFVxoPG3nGwVJeZLauUMzcJWctJvzQzMdEc0Qp3tLeB7q8S6w3fywyMYIcNz1SYPefP45c5MUZMQi9ZhWH_oaOB54HcpG977h0WFA24GpJFz62SSAfi3mq3PemkpDb-duxBfmX3LCH1lgO4H52kTyxIuhspBZECe1QZnLjKy77XPLRnCPNYC8GrR2iLrcvqtoXHQkzfkrOC_EjeuiXAn0TVvFI3RWhbE',
        categoryName: 'Pantry Essentials',
        mrp: 28,
        sellingPrice: 28,
        inStock: true,
        lowStock: false,
        variantName: '1 kg',
        sku: 'SALT-TATA-1K',
    },
    {
        id: 'fallback-3',
        productId: 'prod-india-gate-rice',
        productName: 'India Gate Basmati Rice Feast Rozzana',
        productDescription: 'Aged extra long grain authentic rice',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAZxQJQEvtyJQizuyP7zojnzK8pTm_QRZAEXXyJd1l5IyD45W_jUgG31lWM15rl7vFv8csCq8664y2PLiljM9NWRFDHC-KQy2Sqg63JS3ncT9qIT6dzB9JSAN-wob1aEHrkPmVvy5swChLvgn6d7Qt6a9gvvKju9a97ROtgvQY5OxyxqIFn-Nj-BIKbCCpdhFDMksMFVqJOMqzDz7LxrnghFwLA0Qqpt3zbVRfVEZc',
        categoryName: 'Atta, Rice & Dals',
        mrp: 105,
        sellingPrice: 85,
        inStock: true,
        lowStock: false,
        variantName: '1 kg',
        sku: 'RICE-IG-1K',
    },
    {
        id: 'fallback-4',
        productId: 'prod-amul-butter',
        productName: 'Amul Butter Pasteurised',
        productDescription: 'Utterly Butterly Delicious pure butter',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAOPcE4bz3qovTE2vhNisZ8o3KTaZpOU-8ZMLc5I2TPqccw6Vrwmz2uHbvSnZzqZkx45kdV0OF4roRI7272GcHzQh7N_gI7xOtMQzvXImL1DS66JeuzMoM9QLb1jjXCKqDDM6UQn3o0BZ_61TNQL1dkRIwIu59P2sKUAc838bEMuVlnLPn10ql8eY_vWdbAchGFnAiwTqFMxxAM3PMwLAhHb-LkRdZhKdvT6mRebWY',
        categoryName: 'Dairy & Eggs',
        mrp: 290,
        sellingPrice: 275,
        inStock: true,
        lowStock: false,
        variantName: '500g',
        sku: 'BTR-AMUL-500',
    },
    {
        id: 'fallback-5',
        productId: 'prod-maggi-noodles',
        productName: 'Maggi 2-Minute Masala Noodles',
        productDescription: 'Masala Special 4-in-1 pack',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBVyNSN7gao6BKtjj_-Q5dg5ksUnBzrtXuJs7PANEvtU_hFSaijNrJxFAbH0dAzsFxfSd0fOMQp2PWme8wsmaIa9N2KKG2eMHPKKX9vXRa8fDTHi0OHhuCSJj7upJW6-g4oGbOrdr48VSfc4RZnPOh416Z5iipTtG2mfQnYGpYOzXpf4vtN1nixuSXMwRzQT4nj1dwESVmV92P36mRV4RGZHBT11NP4fwTqX_hAvVk',
        categoryName: 'Snacks & Beverages',
        mrp: 60,
        sellingPrice: 56,
        inStock: true,
        lowStock: false,
        variantName: '280g Pack',
        sku: 'MAG-MAS-4P',
    },
    {
        id: 'fallback-6',
        productId: 'prod-assam-tea',
        productName: 'Karimganj Orthodox Assam Tea',
        productDescription: '250g Jar • Strong aromatic regional blend',
        imageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDIAzMQfASyE9nLFPXlYiSSfGwZZpSLLCARC6o-DvjkmzVj0N6ei0RDqK6ABN7lLvTfNrQ_OLBSMtCJmD5VL2fd_Z0-RwPzbPye5nlqmSJdp3G3rDzwXkzt9DNFmcwhroaCeu0iMQX_pLeS3w86tyksYbTFzjpfLRGzTgMTds6VLsLXf1JzS8OQiveiyiHNk5v3wVilV474L4MZwrdn-qmmFYExVplkSgg5yiFkmgs',
        categoryName: 'Snacks & Beverages',
        mrp: 180,
        sellingPrice: 160,
        inStock: true,
        lowStock: false,
        variantName: '250g Jar',
        sku: 'TEA-KMJ-250',
    },
];

const AISLES = [
    { id: 'all', name: 'All Items', icon: 'grid_view' },
    { id: 'pantry', name: 'Atta, Rice & Dals', icon: 'grain' },
    { id: 'dairy', name: 'Dairy & Eggs', icon: 'egg' },
    { id: 'oils', name: 'Cooking Oils & Ghee', icon: 'water_drop' },
    { id: 'snacks', name: 'Snacks & Beverages', icon: 'lunch_dining' },
    { id: 'household', name: 'Household', icon: 'cleaning_services' },
];

export function StorefrontPage() {
    const { storeId = 'default-store' } = useParams<{ storeId: string }>();
    const navigate = useNavigate();
    const { user, tokens } = useAuthStore();
    const isAuthenticated = Boolean(tokens && user);

    const [selectedAisle, setSelectedAisle] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('relevance');
    const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');

    // Cross-store conflict modal state
    const [pendingConflict, setPendingConflict] = useState<{
        store: { id: string; name: string };
        item: Omit<CartItem, 'quantity'>;
        existingStoreName: string;
    } | null>(null);

    // Dynamic Wolt Modal Sheet state for cart summary
    const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

    // Cart store hooks
    const cartStoreId = useCartStore((s) => s.storeId);
    const cartItems = useCartStore((s) => s.items);
    const cartTotalItems = useCartStore((s) => s.totalItems());
    const cartSubtotal = useCartStore((s) => s.subtotal());
    const addItem = useCartStore((s) => s.addItem);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const replaceCart = useCartStore((s) => s.replaceCart);

    const cartQuantityMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of cartItems) {
            map.set(item.listingId, item.quantity);
        }
        return map;
    }, [cartItems]);

    // Queries
    const storeQuery = useQuery({
        queryKey: ['public-store', storeId],
        queryFn: () => apiClient.getPublicStore(storeId),
    });

    const catalogueQuery = useQuery({
        queryKey: ['public-store-products', storeId],
        queryFn: () => apiClient.getStoreCatalogue(storeId),
    });

    const store = {
        id: storeQuery.data?.id ?? storeId,
        name: storeQuery.data?.name ?? 'Maa Tara Groceries',
        address: storeQuery.data?.address ?? 'Stall No. 4, Station Road Market, Badarpur',
        city: storeQuery.data?.city ?? 'Badarpur',
        locality: storeQuery.data?.locality ?? 'Station Road',
        district: storeQuery.data?.district ?? 'Karimganj',
        is_open: storeQuery.data ? storeQuery.data.is_open : true,
        ratingAverage: 4.8,
        reviewCount: 184,
        logoImageUrl:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCj2ra2y5DOiiSUqRETAyw5fzM04FQ95gEYC7k09TjjPcZXp5Sl5PbNGZ2GCqaOT3SXLnO4qa9OxVlPZfSjnBoBO8dMO8RPqScAM9VO9aptuGRR_IUzAw2VC3NyoGBnBfLAYcoDvyNGcRt8WmqdoyF7gMV6-vjvswZLTPAtqdNyBB-bYrzCxaQ3Mh4snSN7W01AZCf4s2qsGa91oXEELvSBnv7grXbuPi38Bffo6Z0',
    };

    const catalogueItems: ProductItemView[] = useMemo(() => {
        if (catalogueQuery.data?.data && catalogueQuery.data.data.length > 0) {
            return catalogueQuery.data.data.map((p) => ({
                id: p.id,
                productId: p.product_id,
                productName: p.product_name,
                productDescription: p.product_description,
                imageUrl: null,
                categoryName: p.category_name ?? 'Pantry Essentials',
                mrp: p.mrp ?? p.selling_price,
                sellingPrice: p.selling_price,
                inStock: p.in_stock,
                lowStock: p.low_stock,
                variantName:
                    p.variant_name ??
                    (p.pack_size ? `${p.pack_size} ${p.unit ?? ''}`.trim() : 'Standard'),
                sku: p.sku,
            }));
        }
        return [];
    }, [catalogueQuery.data]);

    const rawProducts: ProductItemView[] = useMemo(() => {
        if (catalogueItems.length > 0) return catalogueItems;
        if (catalogueQuery.isError || (catalogueQuery.isSuccess && catalogueItems.length === 0)) {
            return FALLBACK_PRODUCTS;
        }
        return [];
    }, [catalogueItems, catalogueQuery.isError, catalogueQuery.isSuccess]);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let items = [...rawProducts];

        if (selectedAisle !== 'all') {
            const aisleObj = AISLES.find((a) => a.id === selectedAisle);
            if (aisleObj) {
                items = items.filter((p) =>
                    p.categoryName
                        .toLowerCase()
                        .includes(aisleObj.name.toLowerCase().split(' ')[0]),
                );
            }
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            items = items.filter(
                (p) =>
                    p.productName.toLowerCase().includes(q) ||
                    (p.productDescription && p.productDescription.toLowerCase().includes(q)),
            );
        }

        if (sortBy === 'price-low') {
            items.sort((a, b) => a.sellingPrice - b.sellingPrice);
        } else if (sortBy === 'price-high') {
            items.sort((a, b) => b.sellingPrice - a.sellingPrice);
        }

        return items;
    }, [rawProducts, selectedAisle, searchQuery, sortBy]);

    // Handle Add to Cart
    const handleAddToCart = (product: ProductItemView) => {
        const itemPayload: Omit<CartItem, 'quantity'> = {
            listingId: product.id,
            productId: product.productId,
            productName: product.productName,
            price: product.sellingPrice,
            mrp: product.mrp,
            imageUrl: product.imageUrl,
            variantName: product.variantName,
            categoryName: product.categoryName,
        };

        const result = addItem({ id: store.id, name: store.name }, itemPayload, 1);
        if (!result.success && result.conflict) {
            setPendingConflict({
                store: { id: store.id, name: store.name },
                item: itemPayload,
                existingStoreName: result.conflict.existingStoreName,
            });
        }
    };

    const handleConfirmReplace = () => {
        if (!pendingConflict) return;
        replaceCart(pendingConflict.store, pendingConflict.item, 1);
        setPendingConflict(null);
    };

    const isCartActiveForThisStore = cartStoreId === store.id && cartTotalItems > 0;

    return (
        <PageContainer>
            {/* Desktop Top Sticky Header */}
            <DesktopHeader>
                <DesktopHeaderInner>
                    <DesktopBrandRow>
                        <BrandLink to="/">
                            <BrandIcon>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ color: '#ffffff', fontSize: '20px' }}
                                >
                                    electric_bolt
                                </span>
                            </BrandIcon>
                            <BrandHeading>Dropzo</BrandHeading>
                        </BrandLink>

                        <LocationButton type="button">
                            <span
                                className="material-symbols-outlined"
                                style={{ color: '#B72301', fontSize: '18px' }}
                            >
                                location_on
                            </span>
                            <div>
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        color: '#5B403A',
                                        display: 'block',
                                    }}
                                >
                                    Station Road, Badarpur
                                </span>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                    {store.name} (12 mins)
                                </span>
                            </div>
                        </LocationButton>
                    </DesktopBrandRow>

                    <SearchContainer>
                        <SearchIcon className="material-symbols-outlined">search</SearchIcon>
                        <SearchInput
                            type="text"
                            placeholder={`Search in ${store.name} (e.g. Atta, Oil, Salt)...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <kbd
                            style={{
                                position: 'absolute',
                                right: '0.75rem',
                                fontSize: '0.6875rem',
                                color: '#5B403A',
                                background: '#E3E1EC',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '4px',
                            }}
                        >
                            ⌘K
                        </kbd>
                    </SearchContainer>

                    <DesktopActions>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '9999px',
                                background: '#7CF994',
                                color: '#002109',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '15px' }}
                            >
                                bolt
                            </span>
                            <span>Express Delivery</span>
                        </div>

                        <CartSummaryButton
                            type="button"
                            onClick={() =>
                                navigate(isAuthenticated ? '/cart' : '/login?redirect=/cart')
                            }
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                            >
                                shopping_basket
                            </span>
                            <span>
                                Cart ({isCartActiveForThisStore ? `₹${cartSubtotal}` : '₹0'})
                            </span>
                        </CartSummaryButton>

                        {isAuthenticated ? (
                            <UserAvatar title={user?.phone ?? 'User'}>
                                {user?.phone ? user.phone.slice(-2) : 'U'}
                            </UserAvatar>
                        ) : (
                            <Link
                                to="/login"
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    color: '#B72301',
                                    textDecoration: 'none',
                                }}
                            >
                                Sign In
                            </Link>
                        )}
                    </DesktopActions>
                </DesktopHeaderInner>
            </DesktopHeader>

            {/* Mobile Top App Bar */}
            <MobileAppBar>
                <MobileBackButton to="/" aria-label="Back to Marketplace">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        arrow_back
                    </span>
                </MobileBackButton>
                <MobileStoreTitleGroup>
                    <MobileStoreName>{store.name}</MobileStoreName>
                    <MobileStoreSubtitle>
                        <span
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '9999px',
                                background: '#006E2D',
                                display: 'inline-block',
                            }}
                        />
                        Badarpur Station Road
                    </MobileStoreSubtitle>
                </MobileStoreTitleGroup>
                <MobileActionButtons>
                    <MobileIconButton
                        type="button"
                        aria-label="Search Store"
                        onClick={() => {
                            const el = document.getElementById('mobile-store-search');
                            el?.focus();
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            search
                        </span>
                    </MobileIconButton>
                    <MobileIconButton
                        type="button"
                        aria-label="Share Store"
                        onClick={() => {
                            navigator.clipboard?.writeText(window.location.href);
                            alert('Store link copied to clipboard!');
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            share
                        </span>
                    </MobileIconButton>
                </MobileActionButtons>
            </MobileAppBar>

            {/* Desktop Breadcrumb & Hub Strip */}
            <BreadcrumbStrip>
                <BreadcrumbInner>
                    <div>
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            Badarpur Central Hub
                        </Link>{' '}
                        /{' '}
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                            Local Kirana Stores
                        </Link>{' '}
                        / <strong style={{ color: '#1A1B22' }}>{store.name}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ color: '#006E2D', fontWeight: 600 }}>
                            ✓ FSSAI Lic: 20324001004128
                        </span>
                        <span>•</span>
                        <span>Live Inventory Sync: 3 mins ago</span>
                    </div>
                </BreadcrumbInner>
            </BreadcrumbStrip>

            {/* Main Storefront Area */}
            <MainContainer>
                {/* Store Showcase Hero Card */}
                <HeroCard>
                    <HeroTopRow>
                        <StoreInfoBlock>
                            <StoreThumbnail>
                                <img
                                    src={
                                        store.logoImageUrl ??
                                        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=300'
                                    }
                                    alt={store.name}
                                />
                            </StoreThumbnail>
                            <StoreDetails>
                                <BadgesRow>
                                    <VerifiedBadge>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '13px' }}
                                        >
                                            verified
                                        </span>
                                        VERIFIED PARTNER
                                    </VerifiedBadge>
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Stall No. 4 • 400m away
                                    </span>
                                </BadgesRow>
                                <StoreHeading>{store.name}</StoreHeading>
                                <StoreAddress>
                                    {store.address}, {store.city}
                                </StoreAddress>
                            </StoreDetails>
                        </StoreInfoBlock>

                        {/* Fulfillment Mode Toggle */}
                        <FulfillmentSwitcher>
                            <FulfillmentCard
                                $active={fulfillmentMode === 'delivery'}
                                onClick={() => setFulfillmentMode('delivery')}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{
                                        color:
                                            fulfillmentMode === 'delivery' ? '#B72301' : '#5B403A',
                                        fontSize: '22px',
                                    }}
                                >
                                    moped
                                </span>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                        Local Delivery
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.6875rem',
                                            color:
                                                fulfillmentMode === 'delivery'
                                                    ? '#B72301'
                                                    : '#5B403A',
                                            fontWeight: 600,
                                        }}
                                    >
                                        ₹20 • Within 25 mins
                                    </div>
                                </div>
                            </FulfillmentCard>

                            <FulfillmentCard
                                $active={fulfillmentMode === 'pickup'}
                                onClick={() => setFulfillmentMode('pickup')}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{
                                        color: fulfillmentMode === 'pickup' ? '#006E2D' : '#5B403A',
                                        fontSize: '22px',
                                    }}
                                >
                                    storefront
                                </span>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                                        Store Pickup
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.6875rem',
                                            color:
                                                fulfillmentMode === 'pickup'
                                                    ? '#006E2D'
                                                    : '#5B403A',
                                            fontWeight: 600,
                                        }}
                                    >
                                        FREE • Ready in 10m
                                    </div>
                                </div>
                            </FulfillmentCard>
                        </FulfillmentSwitcher>
                    </HeroTopRow>

                    <RatingStatusStrip>
                        <RatingBadge>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#f59e0b' }}
                            >
                                star
                            </span>
                            <span>{store.ratingAverage.toFixed(1)}</span>
                            <span style={{ fontSize: '0.6875rem', color: '#78350f' }}>
                                ({store.reviewCount}+ reviews)
                            </span>
                        </RatingBadge>

                        <OpenStatusIndicator>
                            <PulseDot $open={store.is_open} />
                            <span>{store.is_open ? 'Open Now' : 'Closed'}</span>
                            <span style={{ color: '#5B403A', fontWeight: 400 }}>
                                • Closes 9:30 PM
                            </span>
                        </OpenStatusIndicator>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#5B403A',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px', color: '#B72301' }}
                            >
                                schedule
                            </span>
                            <span>12 mins avg. prep time</span>
                        </div>
                    </RatingStatusStrip>
                </HeroCard>

                {/* Mobile Search Input */}
                <div
                    style={{
                        marginBottom: '1rem',
                        display: 'block',
                    }}
                    className="lg:hidden"
                >
                    <SearchContainer style={{ maxWidth: '100%' }}>
                        <SearchIcon className="material-symbols-outlined">search</SearchIcon>
                        <SearchInput
                            id="mobile-store-search"
                            type="text"
                            placeholder={`Search in ${store.name}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </SearchContainer>
                </div>

                {/* Mobile Category Rail */}
                <MobileCategoryRail>
                    {AISLES.map((aisle) => (
                        <MobileCategoryChip
                            key={aisle.id}
                            type="button"
                            $active={selectedAisle === aisle.id}
                            onClick={() => setSelectedAisle(aisle.id)}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '16px' }}
                            >
                                {aisle.icon}
                            </span>
                            <span>{aisle.name}</span>
                        </MobileCategoryChip>
                    ))}
                </MobileCategoryRail>

                {/* Main Content Columns: Left Sidebar + Catalogue */}
                <ContentColumns>
                    {/* Left Sticky Sidebar (Desktop) */}
                    <AislesSidebar>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: '0.5rem',
                                borderBottom: '1px solid #E3E1EC',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>
                                    Store Aisles
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: '#5B403A' }}>
                                    {rawProducts.length} Products In Stock
                                </div>
                            </div>
                            <span
                                className="material-symbols-outlined"
                                style={{ color: '#5B403A', fontSize: '18px' }}
                            >
                                filter_list
                            </span>
                        </div>

                        <SidebarNav>
                            {AISLES.map((aisle) => (
                                <AisleTab
                                    key={aisle.id}
                                    type="button"
                                    $active={selectedAisle === aisle.id}
                                    onClick={() => setSelectedAisle(aisle.id)}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px' }}
                                        >
                                            {aisle.icon}
                                        </span>
                                        <span>{aisle.name}</span>
                                    </span>
                                </AisleTab>
                            ))}
                        </SidebarNav>

                        <div
                            style={{
                                marginTop: '1.25rem',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                background: '#F4F2FD',
                                border: '1px solid #E3E1EC',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ color: '#B72301', fontSize: '22px' }}
                            >
                                support_agent
                            </span>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                    Need custom weight?
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: '#5B403A' }}>
                                    Call Store: +91 94351 00000
                                </div>
                            </div>
                        </div>
                    </AislesSidebar>

                    {/* Catalogue Area */}
                    <CatalogueArea>
                        {/* Bento Promotional Banner */}
                        <PromoBanner>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '2.5rem',
                                        height: '2.5rem',
                                        borderRadius: '0.5rem',
                                        background: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#B72301',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '24px' }}
                                    >
                                        redeem
                                    </span>
                                </div>
                                <div>
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            fontWeight: 800,
                                            background: '#B72301',
                                            color: '#ffffff',
                                            padding: '0.125rem 0.375rem',
                                            borderRadius: '9999px',
                                        }}
                                    >
                                        STORE OFFER
                                    </span>
                                    <h2
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 800,
                                            margin: '0.25rem 0 0',
                                        }}
                                    >
                                        Free 500g Fortune Mustard Pouch on ₹599+ Pantry Orders
                                    </h2>
                                </div>
                            </div>
                        </PromoBanner>

                        {/* Subheader & Sort */}
                        <SubheaderRow>
                            <div>
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0 }}>
                                    Popular Groceries & Daily Essentials
                                </h2>
                                <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                    Showing {filteredProducts.length} items from {store.name}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#5B403A' }}>
                                    Sort by:
                                </span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{
                                        padding: '0.375rem 0.625rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #E3E1EC',
                                        fontSize: '0.8125rem',
                                        background: '#ffffff',
                                        outline: 'none',
                                    }}
                                >
                                    <option value="relevance">Relevance & Availability</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                </select>
                            </div>
                        </SubheaderRow>

                        {/* Product Cards Grid */}
                        <ProductGrid>
                            {filteredProducts.map((product) => {
                                const qtyInCart = cartQuantityMap.get(product.id) ?? 0;

                                return (
                                    <ProductCard key={product.id}>
                                        <div>
                                            <ProductCardHeader>
                                                <VariantTag>
                                                    {product.variantName ?? 'Standard'}
                                                </VariantTag>
                                                <StockBadge $inStock={product.inStock}>
                                                    <span
                                                        style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '9999px',
                                                            background: product.inStock
                                                                ? '#006E2D'
                                                                : '#B72301',
                                                            display: 'inline-block',
                                                        }}
                                                    />
                                                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                                                </StockBadge>
                                            </ProductCardHeader>

                                            <ProductImageFrame>
                                                <img
                                                    src={
                                                        product.imageUrl ??
                                                        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'
                                                    }
                                                    alt={product.productName}
                                                />
                                            </ProductImageFrame>

                                            <ProductTitle>{product.productName}</ProductTitle>
                                            <ProductSubtitle>
                                                {product.productDescription ?? product.categoryName}
                                            </ProductSubtitle>
                                        </div>

                                        <PriceRow>
                                            <PriceGroup>
                                                <SellingPrice>₹{product.sellingPrice}</SellingPrice>
                                                {product.mrp > product.sellingPrice && (
                                                    <MrpPrice>₹{product.mrp}</MrpPrice>
                                                )}
                                            </PriceGroup>

                                            {qtyInCart > 0 ? (
                                                <StepperContainer>
                                                    <StepperBtn
                                                        type="button"
                                                        aria-label="Decrease quantity"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                product.id,
                                                                qtyInCart - 1,
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '15px' }}
                                                        >
                                                            remove
                                                        </span>
                                                    </StepperBtn>
                                                    <span style={{ fontSize: '0.8125rem' }}>
                                                        {qtyInCart}
                                                    </span>
                                                    <StepperBtn
                                                        type="button"
                                                        aria-label="Increase quantity"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                product.id,
                                                                qtyInCart + 1,
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className="material-symbols-outlined"
                                                            style={{ fontSize: '15px' }}
                                                        >
                                                            add
                                                        </span>
                                                    </StepperBtn>
                                                </StepperContainer>
                                            ) : (
                                                <AddButton
                                                    type="button"
                                                    disabled={!product.inStock}
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    <span
                                                        className="material-symbols-outlined"
                                                        style={{ fontSize: '16px' }}
                                                    >
                                                        add
                                                    </span>
                                                    <span>ADD</span>
                                                </AddButton>
                                            )}
                                        </PriceRow>
                                    </ProductCard>
                                );
                            })}
                        </ProductGrid>
                    </CatalogueArea>
                </ContentColumns>
            </MainContainer>

            {/* Mobile Floating Cart Dock (fixed bottom-20) */}
            {isCartActiveForThisStore && (
                <MobileFloatingCart aria-label="Cart Summary">
                    <MobileCartInner>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setIsCartSheetOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setIsCartSheetOpen(true);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                cursor: 'pointer',
                                flex: 1,
                                minWidth: 0,
                            }}
                        >
                            <div
                                style={{
                                    position: 'relative',
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '0.5rem',
                                    background: '#B72301',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    flexShrink: 0,
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '20px' }}
                                >
                                    shopping_bag
                                </span>
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: '#006E2D',
                                        color: '#ffffff',
                                        borderRadius: '9999px',
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {cartTotalItems}
                                </span>
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.9375rem', fontWeight: 800 }}>
                                    ₹{cartSubtotal}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.6875rem',
                                        color: '#7CF994',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    Free store pickup or ₹20 delivery
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <button
                                type="button"
                                aria-label="View items in cart"
                                onClick={() => setIsCartSheetOpen(true)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                    borderRadius: '0.5rem',
                                    width: '2.25rem',
                                    height: '2.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                >
                                    format_list_bulleted
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsCartSheetOpen(true)}
                                style={{
                                    background: '#B72301',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    padding: '0.5rem 0.875rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <span>View Cart</span>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '15px' }}
                                >
                                    expand_less
                                </span>
                            </button>
                        </div>
                    </MobileCartInner>
                </MobileFloatingCart>
            )}

            {/* Desktop Floating Cart Dock (fixed bottom-6 right-6) */}
            {isCartActiveForThisStore && (
                <DesktopFloatingCart>
                    <DesktopCartInner>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingBottom: '0.5rem',
                                borderBottom: '1px solid #E3E1EC',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                    style={{
                                        width: '2rem',
                                        height: '2rem',
                                        borderRadius: '0.5rem',
                                        background: '#B72301',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px' }}
                                    >
                                        shopping_cart
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>
                                        {cartTotalItems} {cartTotalItems === 1 ? 'Item' : 'Items'}{' '}
                                        in Cart
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: '#5B403A' }}>
                                        {store.name}
                                    </div>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 800 }}>
                                ₹{cartSubtotal}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: '0.75rem',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    navigate(
                                        isAuthenticated ? '/checkout' : '/login?redirect=/checkout',
                                    )
                                }
                                style={{
                                    flex: 1,
                                    padding: '0.5rem 1rem',
                                    borderRadius: '9999px',
                                    background: '#B72301',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontSize: '0.8125rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.375rem',
                                    boxShadow: '0 2px 4px rgba(183, 35, 1, 0.25)',
                                }}
                            >
                                <span>Proceed to Checkout</span>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px' }}
                                >
                                    arrow_forward
                                </span>
                            </button>
                        </div>
                    </DesktopCartInner>
                </DesktopFloatingCart>
            )}

            {/* Wolt Modal Sheet Cart Summary Drawer */}
            <WoltModalSheet
                isOpen={isCartSheetOpen && isCartActiveForThisStore && cartTotalItems > 0}
                onClose={() => setIsCartSheetOpen(false)}
                title="Cart Summary"
                subtitle={`${store.name} • ${cartTotalItems} ${cartTotalItems === 1 ? 'item' : 'items'}`}
                enableDrag={false}
                badge={
                    <span
                        style={{
                            background: '#006E2D',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                            bolt
                        </span>
                        {fulfillmentMode === 'pickup' ? 'STORE PICKUP' : '15-30 MINS'}
                    </span>
                }
                stickyActionBar={
                    <button
                        type="button"
                        onClick={() => {
                            setIsCartSheetOpen(false);
                            navigate(isAuthenticated ? '/checkout' : '/login?redirect=/checkout');
                        }}
                        style={{
                            width: '100%',
                            padding: '0.875rem 1.25rem',
                            background: '#B72301',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '0.9375rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 4px 14px rgba(183, 35, 1, 0.35)',
                            transition: 'all 0.15s ease-in-out',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Proceed to Checkout</span>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '18px' }}
                            >
                                arrow_forward
                            </span>
                        </span>
                        <span style={{ fontSize: '1.0625rem', fontWeight: 800 }}>
                            ₹{fulfillmentMode === 'pickup' ? cartSubtotal : cartSubtotal + 20}
                        </span>
                    </button>
                }
            >
                <CartSheetItemList>
                    {cartItems.map((item) => (
                        <CartSheetItemRow key={item.listingId}>
                            <CartSheetItemInfo>
                                <CartSheetItemThumb>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.productName} />
                                    ) : (
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ color: '#8F7069', fontSize: '20px' }}
                                        >
                                            shopping_bag
                                        </span>
                                    )}
                                </CartSheetItemThumb>
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 700,
                                            color: '#1A1B22',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {item.productName}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#5B403A',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginTop: '2px',
                                        }}
                                    >
                                        {item.variantName && <span>{item.variantName}</span>}
                                        <span style={{ fontWeight: 800, color: '#1A1B22' }}>
                                            ₹{item.price}
                                        </span>
                                    </div>
                                </div>
                            </CartSheetItemInfo>

                            <QuantityStepper
                                quantity={item.quantity}
                                onIncrement={() =>
                                    updateQuantity(item.listingId, item.quantity + 1)
                                }
                                onDecrement={() =>
                                    updateQuantity(item.listingId, item.quantity - 1)
                                }
                            />
                        </CartSheetItemRow>
                    ))}
                </CartSheetItemList>

                <div
                    style={{
                        background: '#F4F2FD',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        marginTop: '12px',
                        color: '#1A1B22',
                        border: '1px solid #E3E1EC',
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '16px', color: '#006E2D' }}
                        >
                            verified
                        </span>
                        <span>
                            {fulfillmentMode === 'pickup'
                                ? 'Free Store Pickup'
                                : 'Badarpur Local Delivery'}
                        </span>
                    </span>
                    <strong style={{ color: '#006E2D' }}>
                        {fulfillmentMode === 'pickup' ? 'FREE' : '₹20'}
                    </strong>
                </div>

                <CartSheetBillCard>
                    <CartSheetBillRow>
                        <span>Items Subtotal</span>
                        <span>₹{cartSubtotal}</span>
                    </CartSheetBillRow>
                    <CartSheetBillRow>
                        <span>Fulfillment Fee</span>
                        <span
                            style={{
                                color: fulfillmentMode === 'pickup' ? '#006E2D' : 'inherit',
                            }}
                        >
                            {fulfillmentMode === 'pickup' ? 'FREE' : '₹20'}
                        </span>
                    </CartSheetBillRow>
                    <div style={{ height: '1px', background: '#E3E1EC', margin: '4px 0' }} />
                    <CartSheetBillRow $bold>
                        <span>Grand Total</span>
                        <span style={{ color: '#B72301' }}>
                            ₹{fulfillmentMode === 'pickup' ? cartSubtotal : cartSubtotal + 20}
                        </span>
                    </CartSheetBillRow>
                </CartSheetBillCard>
            </WoltModalSheet>

            {/* Cross-Store Conflict Confirmation Modal */}
            {pendingConflict && (
                <ModalOverlay>
                    <ModalCard>
                        <div
                            style={{
                                width: '3rem',
                                height: '3rem',
                                borderRadius: '9999px',
                                background: '#FFDAD3',
                                color: '#B72301',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 0.75rem',
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: '28px' }}
                            >
                                storefront
                            </span>
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                            Replace Cart Items?
                        </h3>
                        <p
                            style={{
                                fontSize: '0.8125rem',
                                color: '#5B403A',
                                margin: 0,
                                lineHeight: 1.4,
                            }}
                        >
                            Your cart already contains items from{' '}
                            <strong>{pendingConflict.existingStoreName}</strong>. Dropzo orders are
                            fulfilled from one local store at a time. Clear cart and add item from{' '}
                            <strong>{pendingConflict.store.name}</strong>?
                        </p>
                        <ModalActions>
                            <ModalButton type="button" onClick={() => setPendingConflict(null)}>
                                Cancel
                            </ModalButton>
                            <ModalButton type="button" $primary onClick={handleConfirmReplace}>
                                Start Fresh Cart
                            </ModalButton>
                        </ModalActions>
                    </ModalCard>
                </ModalOverlay>
            )}
        </PageContainer>
    );
}
