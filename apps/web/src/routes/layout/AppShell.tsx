import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ResponsiveContainer, PageHeader, Button } from '../../components/ui';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
    const clearSession = useAuthStore((state) => state.clearSession);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    return (
        <ResponsiveContainer style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
            <PageHeader
                title={title}
                action={
                    user && (
                        <Button
                            $variant="secondary"
                            $size="sm"
                            onClick={() => {
                                clearSession();
                                navigate('/login');
                            }}
                        >
                            Log out ({user.phone})
                        </Button>
                    )
                }
            />
            {children}
        </ResponsiveContainer>
    );
}
