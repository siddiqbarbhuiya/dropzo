import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@dropzo/api-client';
import { apiClient } from '../lib/apiClient';
import { useAuthStore } from '../store/useAuthStore';

const Card = styled.div`
    max-width: 24rem;
    margin: 4rem auto;
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    font-family: system-ui, sans-serif;
`;

const Field = styled.input`
    width: 100%;
    padding: 0.5rem;
    margin: 0.5rem 0 1rem;
    border-radius: 0.375rem;
    border: 1px solid #cbd5e1;
    box-sizing: border-box;
`;

const Button = styled.button`
    width: 100%;
    padding: 0.6rem;
    border-radius: 0.375rem;
    border: none;
    background: #15803d;
    color: white;
    cursor: pointer;

    &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
    }
`;

const ErrorText = styled.p`
    color: #b91c1c;
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
        <Card>
            <h1>Dropzo</h1>
            <p>Sign in with your phone number.</p>

            <label htmlFor="phone">Phone number</label>
            <Field
                id="phone"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                disabled={step === 'code'}
                onChange={(e) => setPhone(e.target.value)}
            />

            {step === 'code' && (
                <>
                    <label htmlFor="code">OTP code</label>
                    <Field
                        id="code"
                        type="text"
                        inputMode="numeric"
                        placeholder="123456"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            {step === 'phone' ? (
                <Button disabled={busy || !phone} onClick={handleSendOtp}>
                    Send OTP
                </Button>
            ) : (
                <Button disabled={busy || !code} onClick={handleVerifyOtp}>
                    Verify and sign in
                </Button>
            )}
        </Card>
    );
}
