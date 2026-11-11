import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { withTheme } from './test/renderWithProviders';

vi.mock('./lib/apiClient', () => ({
    apiClient: {
        getHealth: () => new Promise(() => {}),
        listPublicStores: () =>
            Promise.resolve({ data: [], total: 0, page: 1, limit: 10, totalPages: 1 }),
    },
}));

function renderApp() {
    const queryClient = new QueryClient();
    return render(
        withTheme(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </QueryClientProvider>,
        ),
    );
}

describe('App', () => {
    it('renders the Dropzo heading', () => {
        renderApp();
        expect(screen.getByRole('heading', { name: 'Dropzo' })).toBeInTheDocument();
    });
});
