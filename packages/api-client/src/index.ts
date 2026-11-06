import type { ApiHealthResponse } from '@dropzo/shared-types';

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function createApiClient(baseUrl: string) {
    const root = baseUrl.replace(/\/$/, '');

    async function getHealth(): Promise<ApiHealthResponse> {
        const response = await fetch(`${root}/health`);
        if (!response.ok) {
            throw new ApiError(
                `Health check failed with status ${response.status}`,
                response.status,
            );
        }
        return (await response.json()) as ApiHealthResponse;
    }

    return { getHealth };
}
