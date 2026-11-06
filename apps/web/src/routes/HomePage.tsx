import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useUiStore } from '../store/useUiStore';

const Card = styled.div`
    max-width: 28rem;
    margin: 4rem auto;
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    text-align: center;
    font-family: system-ui, sans-serif;
`;

const Status = styled.p<{ $ok: boolean }>`
    color: ${(props) => (props.$ok ? '#15803d' : '#b91c1c')};
`;

export function HomePage() {
    const toggleSidebar = useUiStore((state) => state.toggleSidebar);
    const isSidebarOpen = useUiStore((state) => state.isSidebarOpen);

    const health = useQuery({
        queryKey: ['health'],
        queryFn: () => apiClient.getHealth(),
        retry: false,
    });

    return (
        <Card>
            <h1>Dropzo</h1>
            <p>Local grocery and daily-needs marketplace — Badarpur, Sribhumi, Assam.</p>

            {health.isLoading && <Status $ok={false}>Checking backend…</Status>}
            {health.isError && (
                <Status $ok={false}>Backend unreachable. Is the API running?</Status>
            )}
            {health.data && (
                <Status $ok={true}>
                    Backend status: {health.data.status} (uptime {health.data.uptimeSeconds}s)
                </Status>
            )}

            <button onClick={toggleSidebar}>
                {isSidebarOpen ? 'Hide' : 'Show'} sidebar (Zustand demo)
            </button>
        </Card>
    );
}
