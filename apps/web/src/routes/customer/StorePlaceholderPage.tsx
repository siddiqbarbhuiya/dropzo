import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export function StorePlaceholderPage() {
    const { storeId } = useParams<{ storeId: string }>();

    const storeQuery = useQuery({
        queryKey: ['public-store', storeId],
        queryFn: () => (storeId ? apiClient.getPublicStore(storeId) : null),
        enabled: Boolean(storeId),
    });

    const store = storeQuery.data;

    return (
        <div className="min-h-screen bg-[#FBF8FF] text-[#1A1B22] font-['Plus_Jakarta_Sans',sans-serif]">
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E3E1EC] px-4 py-3 flex items-center justify-between">
                <Link
                    to="/"
                    className="flex items-center gap-1.5 text-sm font-bold text-[#B72301] hover:underline"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Back to Marketplace</span>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#7CF994]/40 text-[#007230]">
                        {store?.is_open ? 'Open Now' : 'Closed'}
                    </span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-[#E3E1EC] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#B72301] text-[28px]">
                                storefront
                            </span>
                            <h1 className="text-2xl font-extrabold text-[#1A1B22]">
                                {store?.name ?? 'Store Front'}
                            </h1>
                        </div>
                        <p className="text-sm text-[#5B403A]">
                            {store?.address ?? 'Badarpur, Sribhumi, Assam'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="bg-[#FFDAD3] text-[#8C1800] text-xs font-bold px-3 py-1.5 rounded-full">
                            Express & Pickup
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-8 border border-dashed border-[#8F7069]/40 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-[#FFDAD3]/50 text-[#B72301] flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-[32px]">inventory_2</span>
                    </div>
                    <h2 className="text-lg font-bold text-[#1A1B22]">Store Catalogue Loading</h2>
                    <p className="text-sm text-[#5B403A] max-w-md mx-auto">
                        We are currently syncing live inventory batches and catalogue items for{' '}
                        {store?.name ?? 'this store'}. Full storefront browsing will be available
                        shortly.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B72301] text-white font-bold text-sm shadow hover:bg-[#8C1800] transition-colors"
                    >
                        Browse Other Stores
                    </Link>
                </div>
            </main>
        </div>
    );
}
