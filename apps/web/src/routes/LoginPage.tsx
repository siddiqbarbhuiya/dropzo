import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { Card, Input, Button, OTPInput, ErrorState } from '../components/ui';
import { typeScale } from '../theme';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.lg};
`;

const StyledCard = styled(Card)`
    max-width: 24rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
    ${({ theme }) => typeScale(theme.typography.headlineXl)}
    color: ${({ theme }) => theme.colors.primary};
`;

const Subtitle = styled.p`
    ${({ theme }) => typeScale(theme.typography.bodyMd)}
    color: ${({ theme }) => theme.colors.textMuted};
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
    ${({ theme }) => typeScale(theme.typography.labelMd)}
    color: ${({ theme }) => theme.colors.textSecondary};
`;

export function LoginPage() {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const setSession = useAuthStore((state) => state.setSession);
    const navigate = useNavigate();

    async function handleSendOtp() {
        setError(null);
        setBusy(true);
        try {
            await apiClient.sendOtp(phone);
            setStep('code');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not send the OTP.');
        } finally {
            setBusy(false);
        }
    }

    async function handleVerifyOtp() {
        setError(null);
        setBusy(true);
        try {
            const tokens = await apiClient.verifyOtp(phone, code);
            setSession(tokens, null);
            const me = await apiClient.getMe();
            setSession(tokens, me);
            navigate('/');
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not verify the OTP.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Wrapper>
            <StyledCard>
                <div>
                    <Title>Dropzo</Title>
                    <Subtitle>Sign in with your phone number.</Subtitle>
                </div>

                <Input
                    id="phone"
                    label="Phone number"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    disabled={step === 'code'}
                    onChange={(e) => setPhone(e.target.value)}
                />

                {step === 'code' && (
                    <Field>
                        <Label htmlFor="code">OTP code</Label>
                        <OTPInput value={code} onChange={setCode} aria-label="One-time password" />
                    </Field>
                )}

                {error && <ErrorState title="Could not sign in" description={error} />}

                {step === 'phone' ? (
                    <Button $fullWidth disabled={busy || !phone} onClick={handleSendOtp}>
                        Send OTP
                    </Button>
                ) : (
                    <Button $fullWidth disabled={busy || code.length < 4} onClick={handleVerifyOtp}>
                        Verify and sign in
                    </Button>
                )}
            </StyledCard>
        </Wrapper>
    );
}
