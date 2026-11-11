import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const Shell = styled.div`
    max-width: 36rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
`;

const TopBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e2e8f0;
`;

const LogoutButton = styled.button`
    background: none;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    padding: 0.35rem 0.75rem;
    cursor: pointer;
`;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
    const clearSession = useAuthStore((state) => state.clearSession);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    return (
        <Shell>
            <TopBar>
                <strong>{title}</strong>
                {user && (
                    <LogoutButton
                        onClick={() => {
                            clearSession();
                            navigate('/login');
                        }}
                    >
                        Log out ({user.phone})
                    </LogoutButton>
                )}
            </TopBar>
            {children}
        </Shell>
    );
}
