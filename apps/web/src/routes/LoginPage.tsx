import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { OTPInput } from '../components/ui';
import { typeScale, media } from '../theme';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
    display: flex;
    flex-direction: column;
    justify-content: space-between;
`;

// Top Minimal Utility Bar
const TopBar = styled.header`
    width: 100%;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    padding: 0.875rem 1rem;
    position: sticky;
    top: 0;
    z-index: 30;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(227, 225, 236, 0.6);
    display: flex;
    align-items: center;
    justify-content: space-between;

    ${media.tablet} {
        padding: 0.875rem 2rem;
    }
`;

const TopBrand = styled.div`
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
    color: ${({ theme }) => theme.colors.textOnPrimary};
    box-shadow: 0 2px 4px 0 rgba(255, 87, 51, 0.3);
`;

const BrandTextRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
`;

const BrandName = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineLg)}
    color: ${({ theme }) => theme.colors.rust};
    font-weight: 800;
    letter-spacing: -0.015em;
    margin: 0;
`;

const LiveHubBadge = styled.span`
    display: none;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: rgba(124, 249, 148, 0.7);
    color: #007230;

    ${media.tablet} {
        display: inline-block;
    }
`;

const TopRightCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const LocationBadge = styled.div`
    display: none;
    align-items: center;
    gap: 0.5rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    border: 1px solid rgba(227, 225, 236, 0.8);

    ${media.tablet} {
        display: flex;
    }
`;

const ComplianceTag = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textMuted};

    span.code {
        display: none;
        font-family: monospace;
        font-size: 0.6875rem;
        color: ${({ theme }) => theme.colors.border};

        ${media.desktop} {
            display: inline;
        }
    }
`;

// Main Auth Canvas
const MainCanvas = styled.main`
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.75rem 2rem;
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;

    ${media.tablet} {
        padding: 1.5rem;
    }

    ${media.desktop} {
        padding: 2rem;
    }
`;

const SplitCard = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    border-radius: 1.5rem;
    overflow: hidden;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    box-shadow: 0 12px 40px -10px rgba(24, 24, 27, 0.08);
    border: 1px solid rgba(232, 231, 241, 0.8);

    ${media.desktop} {
        grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
        min-height: 40rem;
    }
`;

// Left Hero Branding Panel (Desktop Only)
const LeftHero = styled.section`
    display: none;

    ${media.desktop} {
        display: flex;
        background: linear-gradient(135deg, #f4f2fd 0%, #eeedf7 50%, #e8e7f1 100%);
        padding: 2.5rem;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        border-right: 1px solid ${({ theme }) => theme.colors.surfaceContainerHigh};
    }
`;

const HeroTopContent = styled.div`
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
`;

const ExpressDeliveryBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    align-self: flex-start;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textPrimary};
`;

const HeroTitle = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineXl)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.02em;

    span.highlight {
        color: ${({ theme }) => theme.colors.primary};
    }
`;

const HeroDescription = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.6;
`;

const FeatureList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
`;

const FeatureCard = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
    transition: all 0.2s ease;

    &:hover {
        background: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06);
    }
`;

const FeatureIcon = styled.div<{ $bg: string; $color: string }>`
    width: 2.5rem;
    height: 2.5rem;
    border-radius: ${({ theme }) => theme.radii.xl};
    background: ${({ $bg }) => $bg};
    color: ${({ $color }) => $color};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const FeatureTitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelLg)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 600;
`;

const FeatureSub = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.border};
`;

const SocialProof = styled.div`
    position: relative;
    z-index: 10;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
    border-top: 1px solid rgba(227, 225, 236, 0.8);
`;

const SocialProofCard = styled.div`
    padding: 1rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const AvatarStack = styled.div`
    display: flex;
    margin-left: -0.25rem;

    & > div {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.75rem;
        margin-left: -0.5rem;

        &:first-child {
            margin-left: 0;
        }
    }
`;

// Right Authentication Card (and full mobile content)
const RightAuth = styled.section`
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};

    ${media.tablet} {
        padding: 2.5rem;
    }

    ${media.desktop} {
        padding: 3rem;
    }
`;

const FormContainer = styled.div`
    max-width: 28rem;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
`;

// Mobile Top Branding (hidden on desktop)
const MobileHeader = styled.header`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-top: 0.25rem;
    margin-bottom: 0.5rem;

    ${media.desktop} {
        display: none;
    }
`;

const MobileBrandBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: #ffffff;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    padding: 0.375rem 0.875rem;
    border-radius: 9999px;
    border: 1px solid rgba(228, 190, 182, 0.3);
    margin-bottom: 0.5rem;
`;

const MobileBolt = styled.div`
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    box-shadow: 0 1px 2px 0 rgba(255, 87, 51, 0.3);
`;

const MobileBrandTitle = styled.span`
    ${({ theme }) => typeScale(theme.typography.headlineMd)}
    font-weight: 800;
    color: ${({ theme }) => theme.colors.rust};
    letter-spacing: -0.01em;
`;

const MobileTagBadge = styled.span`
    background: #7cf994;
    color: #007230;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-weight: 700;
`;

const MobileMainHeading = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
    margin: 0.25rem 0 0;
`;

const MobileSubHeading = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0.25rem 0 0;
    max-width: 20rem;
`;

// Segmented Role Tabs
const RoleTabs = styled.div`
    width: 100%;
    padding: 0.25rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border-radius: 9999px;
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: center;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
`;

const RoleTabButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 0.45rem 0.5rem;
    border-radius: 9999px;
    border: none;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: ${({ $active }) => ($active ? '700' : '600')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
    background: ${({ $active, theme }) =>
        $active ? theme.colors.surfaceContainerLowest : 'transparent'};
    box-shadow: ${({ $active }) => ($active ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none')};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const PortalHeadingCluster = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

const PortalTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const PortalTitle = styled.h2`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
    letter-spacing: -0.015em;

    ${media.desktop} {
        ${({ theme }) => typeScale(theme.typography.headlineLg)}
        font-weight: 800;
    }
`;

const PortalSubtitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};

    ${media.desktop} {
        ${({ theme }) => typeScale(theme.typography.bodyMd)}
    }
`;

const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
`;

const FieldLabel = styled.label`
    display: block;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 600;
`;

const PhoneInputBox = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 0.75rem;
    border: 1.5px solid rgba(228, 190, 182, 0.6);
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    transition: all 0.15s ease;
    overflow: hidden;

    &:focus-within {
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(255, 87, 51, 0.15);
    }
`;

const CountryCodeCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 0.5rem 0.625rem 0.75rem;
    border-right: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    background: rgba(244, 242, 253, 0.5);
    user-select: none;
`;

const IndianFlagSvg = () => (
    <svg
        aria-label="India Flag"
        style={{
            width: '1.25rem',
            height: '0.875rem',
            borderRadius: '2px',
            border: '1px solid #e3e1ec',
        }}
        viewBox="0 0 900 600"
    >
        <path d="M0 0h900v200H0z" fill="#FF9933" />
        <path d="M0 200h900v200H0z" fill="#FFFFFF" />
        <path d="M0 400h900v200H0z" fill="#128807" />
        <circle cx="450" cy="300" fill="#000080" opacity="0.1" r="80" />
        <circle cx="450" cy="300" fill="none" r="70" stroke="#000080" strokeWidth="10" />
    </svg>
);

const PhoneInputField = styled.input`
    width: 100%;
    padding: 0.625rem 0.75rem;
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    border: none;
    background: transparent;
    letter-spacing: 0.05em;

    &:focus {
        outline: none;
    }

    &::placeholder {
        color: rgba(143, 112, 105, 0.4);
    }
`;

const ClearButton = styled.button`
    background: transparent;
    border: none;
    padding: 0.375rem;
    margin-right: 0.5rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &:hover {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

const DeliveryReassurance = styled.p`
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    color: ${({ theme }) => theme.colors.secondary};
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0.125rem 0 0;
`;

// OTP Step Styles
const OtpCard = styled.div`
    padding: 1.25rem;
    border-radius: 1rem;
    background: rgba(244, 242, 253, 0.6);
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const OtpPhoneDisplayRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
`;

const VerificationPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: rgba(124, 249, 148, 0.4);
    color: #007230;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 600;
    margin-bottom: 0.25rem;
`;

const OtpTitle = styled.h3`
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    color: ${({ theme }) => theme.colors.textPrimary};
    font-weight: 700;
    margin: 0.125rem 0 0.25rem;
`;

const OtpPhoneText = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
    margin: 0;

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
        font-weight: 700;
    }
`;

const EditPhoneButton = styled.button`
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.colors.primary};
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    font-weight: 700;
    cursor: pointer;
    margin-left: 0.5rem;
    text-decoration: underline;

    &:hover {
        color: ${({ theme }) => theme.colors.rust};
    }
`;

const SmsIconCircle = styled.div`
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ theme }) => theme.colors.primary};
`;

const ResendRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const ResendButton = styled.button`
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.primary};
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 600;
    cursor: pointer;
    padding: 0;

    &:hover:not(:disabled) {
        text-decoration: underline;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const SecurityReminderBox = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainer};
    border: 1px solid rgba(228, 190, 182, 0.3);
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};

    p {
        margin: 0;
        line-height: 1.3;
    }

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
    }
`;

// Alternative Login & Fast WhatsApp
const FastConnectRow = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.25rem 0;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px solid rgba(228, 190, 182, 0.4);
    }

    span {
        position: relative;
        background: ${({ theme }) => theme.colors.surfaceContainerLowest};
        padding: 0 0.75rem;
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        color: ${({ theme }) => theme.colors.textSecondary};
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
`;

const WhatsAppCtaButton = styled.button`
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(0, 110, 45, 0.3);
    background: #ffffff;
    color: #005320;
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(124, 249, 148, 0.15);
    }
`;

const WhatsAppInstantBadge = styled.span`
    background: #7cf994;
    color: #007230;
    ${({ theme }) => typeScale(theme.typography.labelSm)}
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-weight: 700;
`;

const MerchantCalloutCard = styled.div`
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid rgba(228, 190, 182, 0.4);
    display: flex;
    align-items: center;
    justify-content: space-between;

    div.left {
        display: flex;
        align-items: center;
        gap: 0.625rem;
    }

    div.icon {
        width: 2rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: ${({ theme }) => theme.colors.surfaceContainerHighest};
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${({ theme }) => theme.colors.primary};
    }

    p.title {
        ${({ theme }) => typeScale(theme.typography.labelMd)}
        font-weight: 600;
        color: ${({ theme }) => theme.colors.textPrimary};
        margin: 0;
    }

    p.sub {
        ${({ theme }) => typeScale(theme.typography.bodySm)}
        color: ${({ theme }) => theme.colors.textSecondary};
        margin: 0;
    }

    button.link {
        background: transparent;
        border: none;
        color: ${({ theme }) => theme.colors.primary};
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        font-weight: 700;
        cursor: pointer;
        padding: 0;

        &:hover {
            text-decoration: underline;
        }
    }
`;

// Micro Trust Badges Grid
const MobileTrustGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-top: 0.25rem;
`;

const TrustCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.625rem 0.375rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border: 1px solid rgba(228, 190, 182, 0.3);

    span.title {
        ${({ theme }) => typeScale(theme.typography.labelSm)}
        font-weight: 700;
        color: ${({ theme }) => theme.colors.textPrimary};
        margin-top: 0.25rem;
    }

    span.sub {
        font-size: 0.625rem;
        color: ${({ theme }) => theme.colors.textSecondary};
    }
`;

// Action Buttons
const PrimaryAuthButton = styled.button`
    width: 100%;
    padding: 0.875rem 1.5rem;
    border-radius: 9999px;
    border: none;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textOnPrimary};
    ${({ theme }) => typeScale(theme.typography.headlineSm)}
    font-weight: 700;
    box-shadow: 0 8px 16px -4px rgba(255, 87, 51, 0.35);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${({ theme }) => theme.colors.primaryDark};
        box-shadow: 0 10px 20px -4px rgba(255, 87, 51, 0.45);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const TermsText = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    text-align: center;
    color: ${({ theme }) => theme.colors.border};
    line-height: 1.4;
    margin: 0;

    a {
        color: ${({ theme }) => theme.colors.textPrimary};
        text-decoration: underline;

        &:hover {
            color: ${({ theme }) => theme.colors.primary};
        }
    }
`;

const ErrorBanner = styled.div`
    padding: 0.75rem 1rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ theme }) => theme.colors.errorContainer};
    color: ${({ theme }) => theme.colors.errorText};
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
`;

const BottomDeskArea = styled.div`
    padding-top: 1rem;
    border-top: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
`;

const QuickHelpRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}

    ${media.tablet} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    a {
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        ${({ theme }) => typeScale(theme.typography.labelMd)}
        font-weight: 600;

        &.onboard {
            color: ${({ theme }) => theme.colors.tertiary};
        }
        &.desk {
            color: ${({ theme }) => theme.colors.border};
            &:hover {
                color: ${({ theme }) => theme.colors.textPrimary};
            }
        }
    }
`;

const SecurityComplianceNote = styled.div`
    padding: 0.625rem;
    border-radius: 0.75rem;
    background: ${({ theme }) => theme.colors.surfaceContainerLow};
    border: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.border};

    strong {
        color: ${({ theme }) => theme.colors.textPrimary};
        font-weight: 600;
    }
`;

// Canonical Footer
const Footer = styled.footer`
    width: 100%;
    margin-top: 2rem;
    background: ${({ theme }) => theme.colors.surfaceContainer};

    ${media.desktop} {
        margin-top: 4rem;
    }
`;

const FooterInner = styled.div`
    max-width: 80rem;
    margin: 0 auto;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    ${media.tablet} {
        padding: 3rem 2rem;
        gap: 2rem;
    }
`;

const FooterTop = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceContainerHighest};

    ${media.desktop} {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const FooterTitle = styled.span`
    ${({ theme }) => typeScale(theme.typography.headlineMd)}
    color: ${({ theme }) => theme.colors.rust};
    font-weight: 800;
`;

const FooterBadges = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};

    span.green {
        color: ${({ theme }) => theme.colors.secondary};
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }
`;

const FooterLinks = styled.div`
    display: flex;
    flex-wrap: wrap;
    column-gap: 1.5rem;
    row-gap: 0.75rem;
    ${({ theme }) => typeScale(theme.typography.labelMd)}

    a {
        color: ${({ theme }) => theme.colors.textSecondary};
        text-decoration: none;

        &:hover {
            color: ${({ theme }) => theme.colors.primary};
        }
    }
`;

const Copyright = styled.div`
    ${({ theme }) => typeScale(theme.typography.bodySm)}
    color: ${({ theme }) => theme.colors.textSecondary};
`;

// ==================== MAIN COMPONENT ====================

export function LoginPage() {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [role, setRole] = useState<'customer' | 'merchant' | 'admin'>('customer');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [resendTimer, setResendTimer] = useState(45);
    const [whatsAppNotice, setWhatsAppNotice] = useState<string | null>(null);

    const setSession = useAuthStore((state) => state.setSession);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Resend countdown timer
    useEffect(() => {
        if (step !== 'code') return;
        if (resendTimer <= 0) return;

        const timer = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [step, resendTimer]);

    async function handleSendOtp() {
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }
        setError(null);
        setBusy(true);
        try {
            await apiClient.sendOtp(phone);
            setStep('code');
            setResendTimer(45);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not send the OTP.');
        } finally {
            setBusy(false);
        }
    }

    async function handleVerifyOtp() {
        if (code.length < 6) {
            setError('Please enter all 6 digits of the OTP.');
            return;
        }
        setError(null);
        setBusy(true);
        try {
            const tokens = await apiClient.verifyOtp(phone, code);
            setSession(tokens, null);
            const me = await apiClient.getMe();
            setSession(tokens, me);

            // Role-aware or redirect navigation
            const redirectUrl = searchParams.get('redirect');
            if (redirectUrl) {
                navigate(redirectUrl);
            } else if (role === 'merchant') {
                navigate('/merchant');
            } else if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not verify the OTP.');
        } finally {
            setBusy(false);
        }
    }

    function handleWhatsAppOtp() {
        if (phone.length < 10) {
            setError('Please enter your 10-digit mobile number first.');
            return;
        }
        setWhatsAppNotice(`Verification code dispatched via WhatsApp to +91 ${phone}`);
        handleSendOtp();
    }

    // Role-specific text
    const portalConfig = {
        customer: {
            title: 'Welcome to Dropzo',
            subtitle: 'Enter your mobile number to sign in or register instantly.',
            buttonLabel: 'Verify & Proceed',
            buttonIcon: 'arrow_forward',
        },
        merchant: {
            title: 'Merchant Partner POS',
            subtitle:
                'Enter your registered merchant operator contact to access Badarpur Store Terminal.',
            buttonLabel: 'Open Merchant Terminal',
            buttonIcon: 'storefront',
        },
        admin: {
            title: 'Platform Admin Portal',
            subtitle: 'Staff 2FA sign-in for Badarpur Central Hub Operations & Logistics Dispatch.',
            buttonLabel: 'Authorize Dispatch Console',
            buttonIcon: 'admin_panel_settings',
        },
    }[role];

    return (
        <PageContainer>
            {/* Top Minimal Utility Bar */}
            <TopBar>
                <TopBrand>
                    <BrandIcon>
                        <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                            style={{ fontSize: '18px' }}
                        >
                            shopping_bag
                        </span>
                    </BrandIcon>
                    <BrandTextRow>
                        <BrandName>Dropzo</BrandName>
                        <LiveHubBadge>Badarpur Live Hub</LiveHubBadge>
                    </BrandTextRow>
                </TopBrand>

                <TopRightCluster>
                    <LocationBadge>
                        <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                            style={{ fontSize: '16px', color: '#006e2d' }}
                        >
                            location_on
                        </span>
                        <span>Station Road • Karimganj Hub</span>
                    </LocationBadge>
                    <ComplianceTag>
                        <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                            style={{ fontSize: '18px' }}
                        >
                            verified_user
                        </span>
                        <span className="code">FR-AUTH-001/002/003</span>
                    </ComplianceTag>
                </TopRightCluster>
            </TopBar>

            {/* Main Auth Split Canvas */}
            <MainCanvas>
                <SplitCard>
                    {/* Left Hero Branding Panel (Desktop Only) */}
                    <LeftHero>
                        <HeroTopContent>
                            <ExpressDeliveryBadge>
                                <span
                                    className="material-symbols-outlined"
                                    aria-hidden="true"
                                    style={{ fontSize: '18px', color: '#ff5733' }}
                                >
                                    bolt
                                </span>
                                <span>15-Min Hyper-Local Delivery</span>
                            </ExpressDeliveryBadge>

                            <div>
                                <HeroTitle>
                                    Fresh harvest to your kitchen in{' '}
                                    <span className="highlight">Badarpur</span>.
                                </HeroTitle>
                                <HeroDescription style={{ marginTop: '0.75rem' }}>
                                    Fresh produce, daily groceries &amp; essentials from trusted
                                    Badarpur merchants at your doorstep or ready for 1-minute
                                    counter pickup.
                                </HeroDescription>
                            </div>

                            <FeatureList>
                                <FeatureCard>
                                    <FeatureIcon $bg="rgba(124, 249, 148, 0.5)" $color="#007230">
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                        >
                                            storefront
                                        </span>
                                    </FeatureIcon>
                                    <div>
                                        <FeatureTitle>
                                            15-Min Express Pickup at Station Road
                                        </FeatureTitle>
                                        <FeatureSub>
                                            Grab orders on the go without waiting in queue
                                        </FeatureSub>
                                    </div>
                                </FeatureCard>

                                <FeatureCard>
                                    <FeatureIcon $bg="#ffdad3" $color="#8c1800">
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                        >
                                            local_offer
                                        </span>
                                    </FeatureIcon>
                                    <div>
                                        <FeatureTitle>Zero markup on local staples</FeatureTitle>
                                        <FeatureSub>
                                            Authentic mandi &amp; wholesale rates directly passed on
                                        </FeatureSub>
                                    </div>
                                </FeatureCard>

                                <FeatureCard>
                                    <FeatureIcon $bg="#cce5ff" $color="#004b73">
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                        >
                                            handshake
                                        </span>
                                    </FeatureIcon>
                                    <div>
                                        <FeatureTitle>
                                            Trusted by 50+ Badarpur Hub Merchants
                                        </FeatureTitle>
                                        <FeatureSub>
                                            From Kalibari Road to Karimganj Bypass partners
                                        </FeatureSub>
                                    </div>
                                </FeatureCard>
                            </FeatureList>
                        </HeroTopContent>

                        {/* Social Proof & Trust Metrics */}
                        <SocialProof>
                            <SocialProofCard>
                                <AvatarStack>
                                    <div style={{ background: '#7cf994', color: '#007230' }}>
                                        BK
                                    </div>
                                    <div style={{ background: '#ffdad3', color: '#8c1800' }}>
                                        SC
                                    </div>
                                    <div style={{ background: '#cce5ff', color: '#004b73' }}>
                                        AM
                                    </div>
                                </AvatarStack>
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            color: '#006e2d',
                                        }}
                                    >
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                            style={{ fontSize: '16px' }}
                                        >
                                            check_circle
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.6875rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Verified Community Stats
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            marginTop: '0.125rem',
                                        }}
                                    >
                                        Over 10,000+ orders fulfilled in Sribhumi District
                                    </p>
                                </div>
                            </SocialProofCard>
                        </SocialProof>
                    </LeftHero>

                    {/* Right Authentication Card (Unified Responsive Auth) */}
                    <RightAuth>
                        <FormContainer>
                            {/* Mobile Brand Header */}
                            <MobileHeader>
                                <MobileBrandBadge>
                                    <MobileBolt>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '16px' }}
                                        >
                                            bolt
                                        </span>
                                    </MobileBolt>
                                    <MobileBrandTitle>Dropzo</MobileBrandTitle>
                                    <MobileTagBadge>15 MIN</MobileTagBadge>
                                </MobileBrandBadge>
                                <MobileMainHeading>
                                    Badarpur's 15-Minute Grocery &amp; Daily Needs
                                </MobileMainHeading>
                                <MobileSubHeading>
                                    Fast delivery from Station Road, Bazar Ghat &amp; local Mandi
                                    straight to your doorstep.
                                </MobileSubHeading>
                            </MobileHeader>

                            {/* Role Switcher Tabs */}
                            <RoleTabs role="tablist">
                                <RoleTabButton
                                    type="button"
                                    role="tab"
                                    aria-selected={role === 'customer'}
                                    $active={role === 'customer'}
                                    onClick={() => setRole('customer')}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{
                                            fontSize: '16px',
                                            color: role === 'customer' ? '#ff5733' : 'inherit',
                                        }}
                                    >
                                        person
                                    </span>
                                    <span>Customer</span>
                                </RoleTabButton>

                                <RoleTabButton
                                    type="button"
                                    role="tab"
                                    aria-selected={role === 'merchant'}
                                    $active={role === 'merchant'}
                                    onClick={() => setRole('merchant')}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '16px' }}
                                    >
                                        store
                                    </span>
                                    <span>Merchant POS</span>
                                </RoleTabButton>

                                <RoleTabButton
                                    type="button"
                                    role="tab"
                                    aria-selected={role === 'admin'}
                                    $active={role === 'admin'}
                                    onClick={() => setRole('admin')}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '16px' }}
                                    >
                                        shield_person
                                    </span>
                                    <span>Platform Admin</span>
                                </RoleTabButton>
                            </RoleTabs>

                            {/* Section Headline */}
                            <PortalHeadingCluster>
                                <PortalTitleRow>
                                    <PortalTitle id="portal-title">
                                        {portalConfig.title}
                                    </PortalTitle>
                                    <span
                                        style={{
                                            width: '0.5rem',
                                            height: '0.5rem',
                                            borderRadius: '50%',
                                            background: '#006e2d',
                                            display: 'inline-block',
                                        }}
                                        title="Hub Live"
                                    />
                                </PortalTitleRow>
                                <PortalSubtitle id="portal-subtitle">
                                    {portalConfig.subtitle}
                                </PortalSubtitle>
                            </PortalHeadingCluster>

                            {/* Phone Input Box */}
                            <InputGroup>
                                <FieldLabel htmlFor="phone">Mobile Number</FieldLabel>
                                <PhoneInputBox>
                                    <CountryCodeCluster>
                                        <IndianFlagSvg />
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                            +91
                                        </span>
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                            style={{ fontSize: '16px', color: '#8f7069' }}
                                        >
                                            arrow_drop_down
                                        </span>
                                    </CountryCodeCluster>
                                    <PhoneInputField
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="94351 00000"
                                        value={phone}
                                        disabled={step === 'code' || busy}
                                        onChange={(e) =>
                                            setPhone(e.target.value.replace(/\D/g, ''))
                                        }
                                        autoFocus
                                    />
                                    {phone.length > 0 && step === 'phone' && (
                                        <ClearButton
                                            type="button"
                                            aria-label="Clear mobile number"
                                            onClick={() => setPhone('')}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                aria-hidden="true"
                                                style={{ fontSize: '18px' }}
                                            >
                                                cancel
                                            </span>
                                        </ClearButton>
                                    )}
                                    {phone.length === 10 && (
                                        <div
                                            style={{
                                                paddingRight: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#006e2d',
                                            }}
                                            title="Valid 10-digit number"
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                aria-hidden="true"
                                            >
                                                check_circle
                                            </span>
                                        </div>
                                    )}
                                </PhoneInputBox>
                                <DeliveryReassurance>
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{ fontSize: '14px', color: '#006e2d' }}
                                    >
                                        check_circle
                                    </span>
                                    <span>
                                        Available for immediate 15m delivery in Badarpur Town &amp;
                                        Ghat
                                    </span>
                                </DeliveryReassurance>
                            </InputGroup>

                            {/* OTP Code Step */}
                            {step === 'code' && (
                                <OtpCard>
                                    <OtpPhoneDisplayRow>
                                        <div>
                                            <VerificationPill>
                                                <span
                                                    className="material-symbols-outlined"
                                                    style={{ fontSize: '14px' }}
                                                >
                                                    lock
                                                </span>
                                                <span>Verification Step</span>
                                            </VerificationPill>
                                            <OtpTitle>Enter 6-Digit One-Time Password</OtpTitle>
                                            <OtpPhoneText>
                                                OTP sent to{' '}
                                                <strong>
                                                    +91{' '}
                                                    {phone.length === 10
                                                        ? `${phone.slice(0, 5)}-${phone.slice(5)}`
                                                        : phone}
                                                </strong>
                                                <EditPhoneButton
                                                    type="button"
                                                    onClick={() => setStep('phone')}
                                                >
                                                    Edit
                                                </EditPhoneButton>
                                            </OtpPhoneText>
                                        </div>
                                        <SmsIconCircle>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '18px' }}
                                            >
                                                sms
                                            </span>
                                        </SmsIconCircle>
                                    </OtpPhoneDisplayRow>

                                    <OTPInput
                                        length={6}
                                        value={code}
                                        onChange={setCode}
                                        aria-label="One-time password"
                                    />

                                    <ResendRow>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.375rem',
                                                color: '#8f7069',
                                            }}
                                        >
                                            <span
                                                className="material-symbols-outlined"
                                                aria-hidden="true"
                                                style={{ fontSize: '16px' }}
                                            >
                                                timer
                                            </span>
                                            <span>
                                                Resend OTP in{' '}
                                                <strong style={{ color: '#1a1b22' }}>
                                                    {resendTimer > 0
                                                        ? `0:${resendTimer < 10 ? `0${resendTimer}` : resendTimer}`
                                                        : '0:00'}
                                                </strong>
                                            </span>
                                        </div>
                                        <ResendButton
                                            type="button"
                                            disabled={resendTimer > 0 || busy}
                                            onClick={handleSendOtp}
                                        >
                                            Resend via SMS
                                        </ResendButton>
                                    </ResendRow>

                                    <SecurityReminderBox>
                                        <span
                                            className="material-symbols-outlined"
                                            style={{
                                                fontSize: '18px',
                                                color: '#ff5733',
                                                flexShrink: 0,
                                            }}
                                        >
                                            shield
                                        </span>
                                        <p>
                                            <strong>Security hint:</strong> Never share your Dropzo
                                            OTP with anyone, including delivery staff.
                                        </p>
                                    </SecurityReminderBox>
                                </OtpCard>
                            )}

                            {/* Error Alert */}
                            {error && (
                                <ErrorBanner role="alert">
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                        error
                                    </span>
                                    <span>{error}</span>
                                </ErrorBanner>
                            )}

                            {/* WhatsApp Notification Message */}
                            {whatsAppNotice && (
                                <DeliveryReassurance style={{ color: '#006e2d', fontWeight: 600 }}>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '16px' }}
                                    >
                                        chat
                                    </span>
                                    <span>{whatsAppNotice}</span>
                                </DeliveryReassurance>
                            )}

                            {/* Primary Submit CTA */}
                            {step === 'phone' ? (
                                <PrimaryAuthButton
                                    disabled={busy || phone.length < 10}
                                    onClick={handleSendOtp}
                                    aria-label="Get OTP"
                                >
                                    <span>Get OTP</span>
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                        arrow_forward
                                    </span>
                                </PrimaryAuthButton>
                            ) : (
                                <PrimaryAuthButton
                                    disabled={busy || code.length < 6}
                                    onClick={handleVerifyOtp}
                                    aria-label="Verify OTP"
                                >
                                    <span>{portalConfig.buttonLabel}</span>
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                        {portalConfig.buttonIcon}
                                    </span>
                                </PrimaryAuthButton>
                            )}

                            {/* Fast WhatsApp Connect */}
                            <FastConnectRow>
                                <span>or fast connect</span>
                            </FastConnectRow>

                            <WhatsAppCtaButton type="button" onClick={handleWhatsAppOtp}>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '20px', color: '#006e2d' }}
                                >
                                    chat
                                </span>
                                <span>Continue with WhatsApp OTP</span>
                                <WhatsAppInstantBadge>Instant</WhatsAppInstantBadge>
                            </WhatsAppCtaButton>

                            {/* Merchant Onboarding Banner */}
                            <MerchantCalloutCard>
                                <div className="left">
                                    <div className="icon">
                                        <span
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '18px' }}
                                        >
                                            store
                                        </span>
                                    </div>
                                    <div>
                                        <p className="title">Are you a Badarpur shop owner?</p>
                                        <p className="sub">List your grocery store on Dropzo</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="link"
                                    onClick={() => setRole('merchant')}
                                >
                                    Join Partner
                                </button>
                            </MerchantCalloutCard>

                            {/* Micro Trust Grid (Stitch 1:1) */}
                            <MobileTrustGrid>
                                <TrustCard>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: '#ff5733', fontSize: '20px' }}
                                    >
                                        pace
                                    </span>
                                    <span className="title">15 Mins</span>
                                    <span className="sub">Lightning Delivery</span>
                                </TrustCard>
                                <TrustCard>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: '#006e2d', fontSize: '20px' }}
                                    >
                                        nutrition
                                    </span>
                                    <span className="title">Farm Fresh</span>
                                    <span className="sub">Daily Mandi Source</span>
                                </TrustCard>
                                <TrustCard>
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: '#006398', fontSize: '20px' }}
                                    >
                                        lock_clock
                                    </span>
                                    <span className="title">No Minimum</span>
                                    <span className="sub">Order Even ₹10 Items</span>
                                </TrustCard>
                            </MobileTrustGrid>

                            <TermsText>
                                By proceeding, you agree to Dropzo's{' '}
                                <Link to="#">Terms of Service</Link> &amp;{' '}
                                <Link to="#">Privacy Policy</Link>.
                            </TermsText>

                            {/* Bottom Help & Governance Links */}
                            <BottomDeskArea>
                                <QuickHelpRow>
                                    <Link to="#" className="onboard">
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                            style={{ fontSize: '16px' }}
                                        >
                                            business_center
                                        </span>
                                        <span>Merchant Partner Onboarding Portal</span>
                                    </Link>
                                    <Link to="#" className="desk">
                                        <span
                                            className="material-symbols-outlined"
                                            aria-hidden="true"
                                            style={{ fontSize: '16px' }}
                                        >
                                            support_agent
                                        </span>
                                        <span>Badarpur Support Desk</span>
                                    </Link>
                                </QuickHelpRow>

                                <SecurityComplianceNote>
                                    <span
                                        className="material-symbols-outlined"
                                        aria-hidden="true"
                                        style={{
                                            fontSize: '18px',
                                            color: '#006e2d',
                                            flexShrink: 0,
                                        }}
                                    >
                                        lock_clock
                                    </span>
                                    <p style={{ margin: 0 }}>
                                        <strong>Security note:</strong> FR-AUTH compliant session
                                        issued with short-lived tokens and secure cookie refresh.
                                    </p>
                                </SecurityComplianceNote>
                            </BottomDeskArea>
                        </FormContainer>
                    </RightAuth>
                </SplitCard>
            </MainCanvas>

            {/* Canonical Shared Footer */}
            <Footer>
                <FooterInner>
                    <FooterTop>
                        <div>
                            <FooterTitle>Dropzo</FooterTitle>
                            <p
                                style={{
                                    color: '#5b403a',
                                    marginTop: '0.25rem',
                                    fontSize: '0.875rem',
                                }}
                            >
                                Instant hyper-local delivery &amp; fresh essentials network.
                            </p>
                        </div>
                        <FooterBadges>
                            <span className="green">
                                <span
                                    className="material-symbols-outlined"
                                    aria-hidden="true"
                                    style={{ fontSize: '16px' }}
                                >
                                    check_circle
                                </span>
                                <span>FSSAI Licensed Dark Hubs</span>
                            </span>
                            <span>•</span>
                            <span>Fast Hub Dispatch</span>
                            <span>•</span>
                            <span>6:00 AM – 11:00 PM Daily</span>
                        </FooterBadges>
                    </FooterTop>

                    <FooterLinks>
                        <Link to="#">Local Badarpur Farmers</Link>
                        <Link to="#">Partner Onboarding</Link>
                        <Link to="#">Instant Delivery Zones</Link>
                        <Link to="#">Food Safety Standards</Link>
                        <Link to="#">Terms of Service</Link>
                        <Link to="#">Privacy Policy</Link>
                        <Link to="#">Contact Support</Link>
                    </FooterLinks>

                    <Copyright>
                        © 2025 Dropzo Technologies Pvt Ltd. Serving Badarpur, Karimganj, Assam.
                        Farm-to-kitchen daily fulfillment.
                    </Copyright>
                </FooterInner>
            </Footer>
        </PageContainer>
    );
}
