import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../../lib/apiClient';
import { Keypad, LoadingState, ErrorState } from '../../components/ui';
import { typeScale, media } from '../../theme';

// ==================== STYLED COMPONENTS ====================

const Container = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    flex-direction: column;
    user-select: none;
`;

// Top App Bar
const TopBar = styled.header`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
    position: sticky;
    top: 0;
    z-index: 40;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

const BrandSection = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.md};
`;

const StorefrontIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    background: rgba(255, 87, 51, 0.15);
    color: ${({ theme }) => theme.colors.primary};
`;

const StoreTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const AppTitle = styled.span`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    font-weight: 700;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.01em;
`;

const LiveBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    background: ${({ theme }) => theme.colors.successContainer};
    color: ${({ theme }) => theme.colors.secondary};
`;

const PulseDot = styled.span`
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.secondary};
    margin-right: 0.25rem;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`;

const StoreSubtitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const PosBadge = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 700;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    padding: 0.05rem 0.375rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    margin-left: 0.25rem;
`;

const StatusToggles = styled.div`
    display: none;
    align-items: center;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    padding: 0.25rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};

    ${media.desktop} {
        display: flex;
    }
`;

const AcceptingOrdersPill = styled.div`
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 600;
    font-size: 0.75rem;
    gap: 0.5rem;
`;

const PingBeacon = styled.span`
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

const AutoDispatchPill = styled.div`
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const TrailingActions = styled.div`
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
`;

const LoudAlertButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: ${({ $active }) => ($active ? 'rgba(255, 87, 51, 0.12)' : 'transparent')};
    color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.textMuted)};
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid
        ${({ theme, $active }) => ($active ? 'rgba(255, 87, 51, 0.3)' : theme.colors.surfaceContainerHighest)};
    cursor: pointer;
    transition: all 0.15s ease;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    letter-spacing: 0.02em;

    &:hover {
        background: rgba(255, 87, 51, 0.2);
    }
`;

const QuickPinButton = styled.button`
    display: none;
    align-items: center;
    gap: 0.375rem;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textPrimary};
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    cursor: pointer;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    }

    ${media.tablet} {
        display: flex;
    }
`;

const IconButton = styled.button`
    position: relative;
    padding: 0.5rem;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
    }
`;

const RedDot = styled.span`
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 0.625rem;
    height: 0.625rem;
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.colors.surfaceContainerLowest};
`;

const ProfileCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const ProfileText = styled.div`
    text-align: right;
    display: none;

    ${media.desktop} {
        display: block;
    }

    p:first-child {
        ${({ theme }) => typeScale(theme.typography.labelMd)}
        color: ${({ theme }) => theme.colors.textPrimary};
        font-weight: 600;
    }
    p:last-child {
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        color: ${({ theme }) => theme.colors.textMuted};
    }
`;

// KPI Sub-Header Ribbon
const KpiSection = styled.section`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.lg};
`;

const KpiGrid = styled.div`
    max-width: 1720px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;

    ${media.tablet} {
        grid-template-columns: repeat(3, 1fr);
    }

    ${media.desktop} {
        grid-template-columns: repeat(6, 1fr);
    }
`;

const KpiCard = styled.div<{ $highlight?: boolean }>`
    background: rgba(244, 242, 253, 0.7);
    border: 1px solid
        ${({ $highlight, theme }) =>
            $highlight ? 'rgba(255, 87, 51, 0.3)' : theme.colors.surfaceContainerHighest};
    border-radius: ${({ theme }) => theme.radii.xl};
    padding: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    position: relative;
    overflow: hidden;
`;

const HighlightBar = styled.div`
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0.375rem;
    background: ${({ theme }) => theme.colors.primary};
`;

const KpiLabel = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const KpiValue = styled.p<{ $color?: string }>`
    ${({ theme }) => typeScale(theme.typography.headlineLg)}
    color: ${({ $color, theme }) => $color || theme.colors.textPrimary};
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.2;
`;

const KpiIconBox = styled.div<{ $bg: string; $color: string }>`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
`;

// Main Dashboard Grid
const MainLayout = styled.main`
    flex: 1;
    max-width: 1720px;
    width: 100%;
    margin: 0 auto;
    padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
    display: grid;
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing.lg};
    padding-bottom: 6rem;

    ${media.desktop} {
        grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);
        padding-bottom: 2rem;
    }
`;

const LeftColumn = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    min-width: 0;
`;

const RightColumn = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.md};
    min-width: 0;
`;

// Fulfillment Tabs Bar
const TabsToolbar = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    padding: 0.5rem;
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const TabGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    padding: 0.25rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: ${({ theme }) => theme.radii.xl};
`;

const StatusTab = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    border: none;
    background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
    color: ${({ $active, theme }) =>
        $active ? theme.colors.textOnPrimary : theme.colors.textSecondary};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    cursor: pointer;
    box-shadow: ${({ $active }) => ($active ? '0 1px 2px 0 rgba(0, 0, 0, 0.1)' : 'none')};
    transition: all 0.15s ease;

    &:hover {
        color: ${({ $active, theme }) =>
            $active ? theme.colors.textOnPrimary : theme.colors.textPrimary};
        background: ${({ $active, theme }) =>
            $active ? theme.colors.primary : theme.colors.surfaceContainer};
    }
`;

const TabCountBadge = styled.span<{ $active: boolean }>`
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    background: ${({ $active, theme }) =>
        $active ? theme.colors.textOnPrimary : theme.colors.surfaceContainerHighest};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textPrimary)};
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    width: 100%;

    ${media.tablet} {
        width: 14rem;
    }

    & > span {
        position: absolute;
        left: 0.625rem;
        top: 0.5rem;
        color: ${({ theme }) => theme.colors.textMuted};
        font-size: 1.125rem;
    }

    & > input {
        width: 100%;
        padding: 0.375rem 0.75rem 0.375rem 2.25rem;
        background: ${({ theme }) => theme.colors.surfaceContainerLow};
        border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
        border-radius: ${({ theme }) => theme.radii.lg};
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textPrimary};

        &:focus {
            outline: none;
            border-color: ${({ theme }) => theme.colors.primary};
        }
    }
`;

// Active Order Card
const OrderCard = styled.div<{ $urgent?: boolean }>`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: ${({ $urgent, theme }) =>
        $urgent
            ? `2px solid rgba(255, 87, 51, 0.6)`
            : `1px solid ${theme.colors.surfaceContainerHighest}`};
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    padding: ${({ theme }) => theme.spacing.lg};
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
`;

const UrgentBanner = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: ${({ theme }) => theme.colors.primary};
    padding: 0.375rem 1rem;
    color: ${({ theme }) => theme.colors.textOnPrimary};
    display: flex;
    align-items: center;
    justify-content: space-between;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
`;

const UrgentBannerLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: 0.05em;
`;

const TimerBox = styled.div`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: monospace;
    background: rgba(88, 12, 0, 0.2);
    padding: 0.125rem 0.5rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-weight: 700;
`;

const OrderHeaderRow = styled.div<{ $hasUrgent?: boolean }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding-bottom: 0.75rem;
    gap: 0.5rem;
    margin-top: ${({ $hasUrgent }) => ($hasUrgent ? '1.5rem' : '0')};
`;

const OrderNumber = styled.h2`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 800;
    letter-spacing: -0.01em;
`;

const BadgeCluster = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
`;

const ActionNeededBadge = styled.span`
    padding: 0.125rem 0.5rem;
    background: #ffdad3;
    color: #8c1800;
    border-radius: ${({ theme }) => theme.radii.md};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
`;

const FulfillmentBadge = styled.span`
    padding: 0.125rem 0.5rem;
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.textPrimary};
    border-radius: ${({ theme }) => theme.radii.md};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const CustomerMeta = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
    margin-top: 0.25rem;

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const PaymentAndTotal = styled.div`
    text-align: right;
`;

const PaymentMethodBadge = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    background: ${({ theme }) => theme.colors.surfaceContainer};
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 0.125rem 0.5rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-weight: 500;
`;

const OrderTotal = styled.p`
    ${({ theme }) => typeScale(theme.typography.headlineMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 900;
    margin-top: 0.125rem;
`;

// Items Checklist
const ChecklistSection = styled.div`
    padding: 0.75rem 0;
`;

const ChecklistHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
`;

const ChecklistTitle = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
`;

const ChecklistHint = styled.span`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 500;
`;

const ItemsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;

    ${media.tablet} {
        grid-template-columns: repeat(3, 1fr);
    }
`;

const ItemCard = styled.label<{ $checked: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.625rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    border: 1px solid
        ${({ $checked, theme }) =>
            $checked ? theme.colors.secondary : theme.colors.surfaceContainerHighest};
    background: ${({ $checked }) => ($checked ? 'rgba(0, 110, 45, 0.04)' : 'rgba(244, 242, 253, 0.5)')};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: ${({ theme }) => theme.colors.surfaceContainer};
    }
`;

const ItemCheckbox = styled.input`
    margin-top: 0.25rem;
    height: 1.125rem;
    width: 1.125rem;
    accent-color: ${({ theme }) => theme.colors.primary};
`;

const ItemDetails = styled.div`
    flex: 1;
    min-width: 0;
`;

const ItemTitleRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
`;

const ItemTitle = styled.span<{ $checked: boolean }>`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 600;
    text-decoration: ${({ $checked }) => ($checked ? 'line-through' : 'none')};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ItemPrice = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const ItemSub = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

// Action Controls Row
const ActionControlsRow = styled.div`
    padding-top: 0.75rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
`;

const SlaPromise = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textMuted};

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const ButtonCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const RejectButton = styled.button`
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(186, 26, 26, 0.4);
    background: transparent;
    color: ${({ theme }) => theme.colors.error};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.errorContainer};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const PrimaryCtaButton = styled.button`
    padding: 0.5rem 1.5rem;
    border-radius: 9999px;
    border: none;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textOnPrimary};
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(255, 87, 51, 0.3);
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.primaryDark};
        box-shadow: 0 6px 10px -1px rgba(255, 87, 51, 0.4);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const GreenCtaButton = styled.button`
    padding: 0.5rem 1.25rem;
    border-radius: 9999px;
    border: none;
    background: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.textOnSecondary};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: #005320;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// Right Column: Counter PIN Validator
const ValidatorCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 2px solid rgba(255, 87, 51, 0.4);
    padding: ${({ theme }) => theme.spacing.lg};
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
`;

const ValidatorHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const ValidatorTitleCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const PinIconBox = styled.div`
    width: 2.25rem;
    height: 2.25rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: rgba(255, 87, 51, 0.15);
    color: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const ValidatorTitle = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
    letter-spacing: -0.01em;
`;

const ValidatorSub = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

const PinInputContainer = styled.div`
    margin-top: 1rem;
`;

const PinLabel = styled.label`
    display: block;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 0.25rem;
    font-weight: 700;
`;

const PinDisplayRow = styled.div`
    position: relative;
`;

const PinInput = styled.input`
    width: 100%;
    text-align: center;
    ${({ theme }) => typeScale(theme.typography.headlineLg)}
    letter-spacing: 0.5em;
    padding: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: ${({ theme }) => theme.radii.xl};
    border: 2px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    font-family: monospace;
    color: ${({ theme }) => theme.colors.textPrimary};

    &:focus {
        border-color: ${({ theme }) => theme.colors.primary};
        outline: none;
    }
`;

const BackspaceButton = styled.button`
    position: absolute;
    right: 0.75rem;
    top: 0.75rem;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: pointer;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const SecurityRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
`;

const SecurityBadge = styled.span`
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.25rem;
`;

const LockoutNotice = styled.span`
    color: ${({ theme }) => theme.colors.error};
    font-weight: 500;
`;

const ReleaseOrderButton = styled.button`
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    border: none;
    background: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.textOnSecondary};
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    font-weight: 700;
    box-shadow: 0 4px 6px -1px rgba(0, 110, 45, 0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: #005320;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const FeedbackMessage = styled.p<{ $isError?: boolean }>`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ $isError, theme }) => ($isError ? theme.colors.error : theme.colors.secondary)};
    font-weight: 600;
    margin-top: 0.5rem;
    text-align: center;
`;

// Recent Handoffs Card
const HandoffsCard = styled.div`
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    padding: ${({ theme }) => theme.spacing.lg};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
`;

const HandoffsHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

const HandoffsTitle = styled.h4`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
`;

const HandoffList = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 0.5rem;
`;

const HandoffItem = styled.div`
    padding: 0.625rem 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};

    &:last-child {
        border-bottom: none;
    }
`;

const HandoffLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 0.625rem;
`;

const CheckCircleIcon = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: rgba(124, 249, 148, 0.4);
    color: ${({ theme }) => theme.colors.secondary};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const HandoffTitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
`;

const HandoffSub = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

const HandoffRight = styled.div`
    text-align: right;
`;

const HandoffTime = styled.span`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

const CompletedTag = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 700;
`;

// Helper for elapsed time
function minutesAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} min ago`;
}

// ==================== MAIN COMPONENT ====================

export function MerchantOrderDetailPage() {
    const { storeId, orderId } = useParams<{ storeId: string; orderId: string }>();
    const queryClient = useQueryClient();

    // UI state
    const [loudAlert, setLoudAlert] = useState(true);
    const [activeTab, setActiveTab] = useState<'incoming' | 'packing' | 'ready' | 'completed'>(
        'incoming',
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [pickupCode, setPickupCode] = useState('');
    const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

    // Queries
    const order = useQuery({
        queryKey: ['merchant-order', storeId, orderId],
        queryFn: () => apiClient.getMerchantOrder(storeId!, orderId!),
        enabled: !!storeId && !!orderId,
    });

    const delivery = useQuery({
        queryKey: ['merchant-delivery', storeId, orderId],
        queryFn: () => apiClient.getMerchantDelivery(storeId!, orderId!),
        enabled: !!storeId && !!orderId && order.data?.fulfilment_type === 'DELIVERY',
        retry: false,
    });

    function invalidate() {
        queryClient.invalidateQueries({ queryKey: ['merchant-order', storeId, orderId] });
        queryClient.invalidateQueries({ queryKey: ['merchant-orders', storeId] });
        queryClient.invalidateQueries({ queryKey: ['merchant-delivery', storeId, orderId] });
    }

    // Mutations
    const accept = useMutation({
        mutationFn: () => apiClient.acceptOrder(storeId!, orderId!),
        onSuccess: invalidate,
    });

    const reject = useMutation({
        mutationFn: (reason: string) => apiClient.rejectOrder(storeId!, orderId!, reason),
        onSuccess: () => {
            invalidate();
            setShowRejectForm(false);
        },
    });

    const markPreparing = useMutation({
        mutationFn: () => apiClient.markOrderPreparing(storeId!, orderId!),
        onSuccess: invalidate,
    });

    const markReady = useMutation({
        mutationFn: () => apiClient.markOrderReady(storeId!, orderId!),
        onSuccess: invalidate,
    });

    const verifyPickup = useMutation({
        mutationFn: (code: string) => apiClient.verifyPickupCode(storeId!, orderId!, code),
        onSuccess: (result) => {
            if (result.verified) {
                setVerifyMessage('Pickup verified — order completed.');
                setPickupCode('');
                invalidate();
            } else {
                setVerifyMessage(
                    `Incorrect code. ${result.attemptsRemaining} attempt(s) remaining.`,
                );
            }
        },
        onError: (err) => {
            setVerifyMessage(err instanceof ApiError ? err.message : 'Verification failed.');
        },
    });

    const confirmHandover = useMutation({
        mutationFn: () => apiClient.confirmMerchantHandover(storeId!, orderId!),
        onSuccess: invalidate,
    });

    const placedAgo = useMemo(
        () => (order.data ? minutesAgo(order.data.placed_at) : ''),
        [order.data],
    );

    function toggleItem(id: string) {
        setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
    }

    if (order.isLoading) {
        return (
            <Container>
                <LoadingState label="Loading order details..." />
            </Container>
        );
    }

    if (order.isError || !order.data) {
        return (
            <Container>
                <ErrorState description="Could not load this order." />
            </Container>
        );
    }

    const data = order.data;
    const isNewIncoming = data.status === 'CREATED';
    const isReady = data.status === 'READY';
    const anyActionPending =
        accept.isPending || reject.isPending || markPreparing.isPending || markReady.isPending;

    return (
        <Container>
            {/* Top POS Header Bar */}
            <TopBar>
                <BrandSection>
                    <StorefrontIcon>
                        <span className="material-symbols-outlined">storefront</span>
                    </StorefrontIcon>
                    <div>
                        <StoreTitleRow>
                            <AppTitle>Dropzo Merchant</AppTitle>
                            <LiveBadge>
                                <PulseDot />
                                LIVE
                            </LiveBadge>
                        </StoreTitleRow>
                        <StoreSubtitle>
                            <span>Maa Tara Groceries</span>
                            <span>•</span>
                            <span>Station Road, Badarpur</span>
                            <PosBadge>POS #01</PosBadge>
                        </StoreSubtitle>
                    </div>
                </BrandSection>

                {/* Center Quick Status Toggles */}
                <StatusToggles>
                    <AcceptingOrdersPill>
                        <PingBeacon>
                            <span />
                            <span />
                        </PingBeacon>
                        <span>Accepting Orders</span>
                    </AcceptingOrdersPill>
                    <AutoDispatchPill title="Delivery Auto-Dispatch Active">
                        <span>Delivery Auto-Dispatch</span>
                    </AutoDispatchPill>
                </StatusToggles>

                {/* Trailing Action Cluster */}
                <TrailingActions>
                    <LoudAlertButton
                        $active={loudAlert}
                        onClick={() => setLoudAlert(!loudAlert)}
                        title="Toggle Incoming Order Sound Alert"
                    >
                        <span className="material-symbols-outlined">
                            {loudAlert ? 'volume_up' : 'volume_off'}
                        </span>
                        <span>{loudAlert ? 'LOUD ALERT ON' : 'ALERT MUTED'}</span>
                    </LoudAlertButton>

                    <QuickPinButton
                        onClick={() => {
                            const el = document.getElementById('pin-input');
                            if (el) el.focus();
                        }}
                    >
                        <span className="material-symbols-outlined">pin</span>
                        <span>Verify Pickup PIN</span>
                    </QuickPinButton>

                    <IconButton aria-label="Notifications">
                        <span className="material-symbols-outlined">notifications</span>
                        <RedDot />
                    </IconButton>

                    <ProfileCluster>
                        <ProfileText>
                            <p>Bikram Das</p>
                            <p>Store Manager</p>
                        </ProfileText>
                        <IconButton aria-label="Merchant Account">
                            <span className="material-symbols-outlined">account_circle</span>
                        </IconButton>
                    </ProfileCluster>
                </TrailingActions>
            </TopBar>

            {/* KPI & Live Metrics Sub-Header */}
            <KpiSection>
                <KpiGrid>
                    {/* Metric 1: Incoming Orders */}
                    <KpiCard $highlight={isNewIncoming}>
                        {isNewIncoming && <HighlightBar />}
                        <div>
                            <KpiLabel>
                                New Orders
                                {isNewIncoming && <PulseDot />}
                            </KpiLabel>
                            <KpiValue $color="#b72301">{isNewIncoming ? '1' : '3'}</KpiValue>
                        </div>
                        <KpiIconBox $bg="rgba(255, 87, 51, 0.15)" $color="#b72301">
                            <span className="material-symbols-outlined">
                                notification_important
                            </span>
                        </KpiIconBox>
                    </KpiCard>

                    {/* Metric 2: Preparing / Packing */}
                    <KpiCard>
                        <div>
                            <KpiLabel>Preparing / Packing</KpiLabel>
                            <KpiValue $color="#006398">
                                {data.status === 'PREPARING' ? '1' : '4'}
                            </KpiValue>
                        </div>
                        <KpiIconBox $bg="#cce5ff" $color="#006398">
                            <span className="material-symbols-outlined">inventory_2</span>
                        </KpiIconBox>
                    </KpiCard>

                    {/* Metric 3: Ready at Counter */}
                    <KpiCard>
                        <div>
                            <KpiLabel>Ready at Counter</KpiLabel>
                            <KpiValue $color="#006e2d">{isReady ? '1' : '2'}</KpiValue>
                        </div>
                        <KpiIconBox $bg="rgba(124, 249, 148, 0.4)" $color="#006e2d">
                            <span className="material-symbols-outlined">countertops</span>
                        </KpiIconBox>
                    </KpiCard>

                    {/* Metric 4: Today's Gross */}
                    <KpiCard>
                        <div>
                            <KpiLabel>Today's Gross</KpiLabel>
                            <KpiValue>₹4,820</KpiValue>
                        </div>
                        <KpiIconBox $bg="#eeedf7" $color="#1a1b22">
                            <span className="material-symbols-outlined">payments</span>
                        </KpiIconBox>
                    </KpiCard>

                    {/* Metric 5: SLA Average Prep Time */}
                    <KpiCard>
                        <div>
                            <KpiLabel>Avg Prep Time</KpiLabel>
                            <KpiValue>11 mins</KpiValue>
                        </div>
                        <KpiIconBox $bg="#eeedf7" $color="#006e2d">
                            <span className="material-symbols-outlined">speed</span>
                        </KpiIconBox>
                    </KpiCard>

                    {/* Metric 6: On-Time Handoff SLA */}
                    <KpiCard>
                        <div>
                            <KpiLabel>On-Time Handoff</KpiLabel>
                            <KpiValue $color="#006e2d">98%</KpiValue>
                        </div>
                        <KpiIconBox $bg="rgba(124, 249, 148, 0.3)" $color="#006e2d">
                            <span className="material-symbols-outlined">verified</span>
                        </KpiIconBox>
                    </KpiCard>
                </KpiGrid>
            </KpiSection>

            {/* Main Dashboard Layout */}
            <MainLayout>
                {/* Left Column (8 cols): Orders & Action Controls */}
                <LeftColumn>
                    {/* Status Tabs Toolbar */}
                    <TabsToolbar>
                        <TabGroup>
                            <StatusTab
                                $active={activeTab === 'incoming'}
                                onClick={() => setActiveTab('incoming')}
                            >
                                <span>Incoming</span>
                                <TabCountBadge $active={activeTab === 'incoming'}>
                                    {isNewIncoming ? '1' : '3'}
                                </TabCountBadge>
                            </StatusTab>
                            <StatusTab
                                $active={activeTab === 'packing'}
                                onClick={() => setActiveTab('packing')}
                            >
                                <span>Packing Now</span>
                                <TabCountBadge $active={activeTab === 'packing'}>4</TabCountBadge>
                            </StatusTab>
                            <StatusTab
                                $active={activeTab === 'ready'}
                                onClick={() => setActiveTab('ready')}
                            >
                                <span>Ready at Counter</span>
                                <TabCountBadge $active={activeTab === 'ready'}>2</TabCountBadge>
                            </StatusTab>
                            <StatusTab
                                $active={activeTab === 'completed'}
                                onClick={() => setActiveTab('completed')}
                            >
                                <span>Completed</span>
                                <TabCountBadge $active={activeTab === 'completed'}>
                                    28
                                </TabCountBadge>
                            </StatusTab>
                        </TabGroup>

                        <SearchContainer>
                            <SearchInputWrapper>
                                <span className="material-symbols-outlined">search</span>
                                <input
                                    type="text"
                                    placeholder="Search order ID / phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </SearchInputWrapper>
                            <IconButton title="Filter options">
                                <span className="material-symbols-outlined">tune</span>
                            </IconButton>
                        </SearchContainer>
                    </TabsToolbar>

                    {/* Active Order Card */}
                    <OrderCard $urgent={isNewIncoming}>
                        {isNewIncoming && (
                            <UrgentBanner>
                                <UrgentBannerLeft>
                                    <span className="material-symbols-outlined">alarm</span>
                                    <span>
                                        NEW INCOMING ORDER • ARRIVED {placedAgo.toUpperCase()}
                                    </span>
                                </UrgentBannerLeft>
                                <TimerBox>
                                    <span>Auto-reject timer:</span>
                                    <span>02:15</span>
                                </TimerBox>
                            </UrgentBanner>
                        )}

                        <OrderHeaderRow $hasUrgent={isNewIncoming}>
                            <div>
                                <BadgeCluster>
                                    <OrderNumber>#{data.order_number}</OrderNumber>
                                    {isNewIncoming && (
                                        <ActionNeededBadge>Action Needed</ActionNeededBadge>
                                    )}
                                    <FulfillmentBadge>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '14px', color: '#006e2d' }}
                                        >
                                            {data.fulfilment_type === 'PICKUP'
                                                ? 'store'
                                                : 'local_shipping'}
                                        </span>
                                        <span>
                                            {data.fulfilment_type === 'PICKUP'
                                                ? 'Store Counter Pickup'
                                                : 'Home Delivery'}
                                        </span>
                                    </FulfillmentBadge>
                                </BadgeCluster>
                                <CustomerMeta>
                                    Customer: <strong>Cameron Williamson</strong> • (+91 94350
                                    XXXXX) • Regular Shopper (14 orders)
                                </CustomerMeta>
                            </div>

                            <PaymentAndTotal>
                                <PaymentMethodBadge>
                                    {data.payment_method === 'COD'
                                        ? 'COD / Pay at Counter'
                                        : 'Paid Online (UPI)'}
                                </PaymentMethodBadge>
                                <OrderTotal>₹{data.total_amount}</OrderTotal>
                            </PaymentAndTotal>
                        </OrderHeaderRow>

                        {/* Items Checklist */}
                        {data.items && data.items.length > 0 && (
                            <ChecklistSection>
                                <ChecklistHeader>
                                    <ChecklistTitle>
                                        Items Checklist ({data.items.length} items)
                                    </ChecklistTitle>
                                    <ChecklistHint>Check off items as you pick</ChecklistHint>
                                </ChecklistHeader>
                                <ItemsGrid>
                                    {data.items.map((item, index) => {
                                        const isChecked = !!checkedItems[item.id];
                                        return (
                                            <ItemCard
                                                key={item.id}
                                                $checked={isChecked}
                                                onClick={() => toggleItem(item.id)}
                                            >
                                                <ItemCheckbox
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {}}
                                                />
                                                <ItemDetails>
                                                    <ItemTitleRow>
                                                        <ItemTitle $checked={isChecked}>
                                                            {item.quantity}×{' '}
                                                            {item.product_name_snapshot}
                                                        </ItemTitle>
                                                        <ItemPrice>₹{item.line_total}</ItemPrice>
                                                    </ItemTitleRow>
                                                    <ItemSub>
                                                        {item.variant_snapshot || 'Standard'} •
                                                        Shelf #
                                                        {String.fromCharCode(65 + (index % 4))}-0
                                                        {index + 1}
                                                    </ItemSub>
                                                </ItemDetails>
                                            </ItemCard>
                                        );
                                    })}
                                </ItemsGrid>
                            </ChecklistSection>
                        )}

                        {/* Action Controls Row */}
                        <ActionControlsRow>
                            <SlaPromise>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px', color: '#006398' }}
                                >
                                    schedule
                                </span>
                                <span>
                                    Customer promised ready in <strong>15 mins</strong>
                                </span>
                            </SlaPromise>

                            <ButtonCluster>
                                {data.status === 'CREATED' && (
                                    <>
                                        <RejectButton
                                            disabled={anyActionPending}
                                            onClick={() => setShowRejectForm(true)}
                                            aria-label="Reject Order"
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                aria-hidden="true"
                                            >
                                                cancel
                                            </span>
                                            <span>Reject Order</span>
                                        </RejectButton>
                                        <PrimaryCtaButton
                                            disabled={anyActionPending}
                                            onClick={() => accept.mutate()}
                                            aria-label="Accept Order"
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                aria-hidden="true"
                                            >
                                                check_circle
                                            </span>
                                            <span>Accept Order</span>
                                        </PrimaryCtaButton>
                                    </>
                                )}

                                {data.status === 'ACCEPTED' && (
                                    <GreenCtaButton
                                        disabled={anyActionPending}
                                        onClick={() => markPreparing.mutate()}
                                    >
                                        <span className="material-symbols-outlined">
                                            inventory_2
                                        </span>
                                        <span>Mark Preparing</span>
                                    </GreenCtaButton>
                                )}

                                {data.status === 'PREPARING' && (
                                    <GreenCtaButton
                                        disabled={anyActionPending}
                                        onClick={() => markReady.mutate()}
                                    >
                                        <span className="material-symbols-outlined">done_all</span>
                                        <span>Mark Ready for Pickup</span>
                                    </GreenCtaButton>
                                )}

                                {data.status === 'READY' && (
                                    <span
                                        style={{
                                            color: '#006e2d',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        Ready at Counter · Shelf #C-12
                                    </span>
                                )}

                                {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(data.status) && (
                                    <span style={{ color: '#71717a', fontSize: '0.875rem' }}>
                                        Order {data.status.toLowerCase()} — no further action
                                        needed.
                                    </span>
                                )}
                            </ButtonCluster>
                        </ActionControlsRow>

                        {/* Reject Reason Form Drawer */}
                        {showRejectForm && (
                            <div
                                style={{
                                    marginTop: '1rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid #e3e1ec',
                                    display: 'flex',
                                    gap: '0.5rem',
                                    alignItems: 'center',
                                }}
                            >
                                <input
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid #8f7069',
                                    }}
                                    placeholder="Enter rejection reason (required)..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                                <RejectButton
                                    disabled={rejectReason.length < 3 || reject.isPending}
                                    onClick={() => reject.mutate(rejectReason)}
                                >
                                    Confirm reject
                                </RejectButton>
                                <button
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setShowRejectForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </OrderCard>

                    {/* Delivery Partner Handover Details (if Delivery) */}
                    {data.fulfilment_type === 'DELIVERY' && (
                        <div
                            style={{
                                background: '#ffffff',
                                borderRadius: '1rem',
                                border: '1px solid #e3e1ec',
                                padding: '1rem',
                            }}
                        >
                            <h3
                                style={{
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Delivery Dispatch & Handover
                            </h3>
                            {delivery.isLoading && (
                                <LoadingState label="Loading delivery partner..." />
                            )}
                            {delivery.isError && (
                                <p style={{ fontSize: '0.875rem', color: '#71717a' }}>
                                    No delivery partner assigned yet.
                                </p>
                            )}
                            {delivery.data && (
                                <div style={{ fontSize: '0.875rem' }}>
                                    <p>
                                        Partner:{' '}
                                        <strong>
                                            {delivery.data.delivery_partner?.user.full_name ?? '—'}
                                        </strong>{' '}
                                        ({delivery.data.delivery_partner?.user.phone})
                                    </p>
                                    <p>Delivery status: {delivery.data.delivery_status}</p>
                                    {delivery.data.picked_up_confirmed_by_merchant_at ? (
                                        <p
                                            style={{
                                                color: '#006e2d',
                                                fontWeight: 700,
                                                marginTop: '0.5rem',
                                            }}
                                        >
                                            ✓ Handover to delivery partner confirmed
                                        </p>
                                    ) : (
                                        <GreenCtaButton
                                            style={{ marginTop: '0.75rem' }}
                                            disabled={confirmHandover.isPending}
                                            onClick={() => confirmHandover.mutate()}
                                        >
                                            Confirm handover to partner
                                        </GreenCtaButton>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </LeftColumn>

                {/* Right Column (4 cols): Counter PIN Validator & Handoffs */}
                <RightColumn>
                    {/* Counter PIN Validator Widget */}
                    <ValidatorCard>
                        <ValidatorHeader>
                            <ValidatorTitleCluster>
                                <PinIconBox>
                                    <span className="material-symbols-outlined">pin</span>
                                </PinIconBox>
                                <div>
                                    <ValidatorTitle>Counter PIN Validator</ValidatorTitle>
                                    <ValidatorSub>Customer Pickup Verification</ValidatorSub>
                                </div>
                            </ValidatorTitleCluster>
                            <IconButton title="QR Code Scanner Cam">
                                <span className="material-symbols-outlined">qr_code_scanner</span>
                            </IconButton>
                        </ValidatorHeader>

                        <PinInputContainer>
                            <PinLabel>ENTER 6-DIGIT CUSTOMER PIN</PinLabel>
                            <PinDisplayRow>
                                <PinInput
                                    id="pin-input"
                                    type="text"
                                    maxLength={6}
                                    placeholder="• • • • • •"
                                    value={pickupCode}
                                    onChange={(e) =>
                                        setPickupCode(e.target.value.replace(/\D/g, ''))
                                    }
                                    disabled={verifyPickup.isPending}
                                    aria-label="Pickup code"
                                />
                                {pickupCode.length > 0 && (
                                    <BackspaceButton
                                        onClick={() => setPickupCode(pickupCode.slice(0, -1))}
                                        aria-label="Backspace"
                                    >
                                        <span className="material-symbols-outlined">backspace</span>
                                    </BackspaceButton>
                                )}
                            </PinDisplayRow>

                            <SecurityRow>
                                <SecurityBadge>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '14px' }}
                                    >
                                        verified_user
                                    </span>
                                    <span>FR-PICK-001 Enforced</span>
                                </SecurityBadge>
                                <LockoutNotice>5-attempt lockout security</LockoutNotice>
                            </SecurityRow>
                        </PinInputContainer>

                        {/* On-Screen Numeric Keypad */}
                        <div style={{ marginTop: '1rem' }}>
                            <Keypad
                                value={pickupCode}
                                onChange={setPickupCode}
                                maxLength={6}
                                disabled={verifyPickup.isPending}
                            />
                        </div>

                        {/* Verify & Release Order CTA */}
                        <ReleaseOrderButton
                            disabled={pickupCode.length !== 6 || verifyPickup.isPending}
                            onClick={() => verifyPickup.mutate(pickupCode)}
                            aria-label="Verify & Release Order"
                        >
                            <span className="material-symbols-outlined" aria-hidden="true">
                                check_circle
                            </span>
                            <span>Verify &amp; Release Order</span>
                        </ReleaseOrderButton>

                        {verifyMessage && (
                            <FeedbackMessage $isError={!verifyMessage.includes('completed')}>
                                {verifyMessage}
                            </FeedbackMessage>
                        )}
                    </ValidatorCard>

                    {/* Recent Counter Handoffs Activity Log */}
                    <HandoffsCard>
                        <HandoffsHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ color: '#ff5733' }}
                                >
                                    history
                                </span>
                                <HandoffsTitle>Recent Counter Handoffs</HandoffsTitle>
                            </div>
                            <span
                                style={{ fontSize: '0.75rem', fontWeight: 700, color: '#71717a' }}
                            >
                                Today
                            </span>
                        </HandoffsHeader>

                        <HandoffList>
                            <HandoffItem>
                                <HandoffLeft>
                                    <CheckCircleIcon>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px' }}
                                        >
                                            done
                                        </span>
                                    </CheckCircleIcon>
                                    <div>
                                        <HandoffTitle>#DZ-2026-8924 • Debasish N.</HandoffTitle>
                                        <HandoffSub>PIN Verified • 4 items (₹410)</HandoffSub>
                                    </div>
                                </HandoffLeft>
                                <HandoffRight>
                                    <HandoffTime>14:22</HandoffTime>
                                    <CompletedTag>Completed</CompletedTag>
                                </HandoffRight>
                            </HandoffItem>

                            <HandoffItem>
                                <HandoffLeft>
                                    <CheckCircleIcon>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px' }}
                                        >
                                            done
                                        </span>
                                    </CheckCircleIcon>
                                    <div>
                                        <HandoffTitle>#DZ-2026-8919 • R. Mazumdar</HandoffTitle>
                                        <HandoffSub>QR Scanned • 1 item (₹125)</HandoffSub>
                                    </div>
                                </HandoffLeft>
                                <HandoffRight>
                                    <HandoffTime>14:05</HandoffTime>
                                    <CompletedTag>Completed</CompletedTag>
                                </HandoffRight>
                            </HandoffItem>

                            <HandoffItem>
                                <HandoffLeft>
                                    <CheckCircleIcon>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px' }}
                                        >
                                            done
                                        </span>
                                    </CheckCircleIcon>
                                    <div>
                                        <HandoffTitle>#DZ-2026-8915 • Priya Roy</HandoffTitle>
                                        <HandoffSub>PIN Verified • 6 items (₹890)</HandoffSub>
                                    </div>
                                </HandoffLeft>
                                <HandoffRight>
                                    <HandoffTime>13:48</HandoffTime>
                                    <CompletedTag>Completed</CompletedTag>
                                </HandoffRight>
                            </HandoffItem>
                        </HandoffList>

                        <div
                            style={{
                                marginTop: '0.75rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid #e3e1ec',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: '#71717a',
                            }}
                        >
                            <span>Need POS help?</span>
                            <Link
                                to="#"
                                style={{
                                    color: '#ff5733',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                }}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '14px' }}
                                >
                                    support_agent
                                </span>
                                <span>Merchant Support</span>
                            </Link>
                        </div>
                    </HandoffsCard>
                </RightColumn>
            </MainLayout>
        </Container>
    );
}
