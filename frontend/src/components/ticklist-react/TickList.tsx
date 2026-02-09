import { useState, useEffect, useCallback } from 'react';
import type { TicksByDate, GroupedRoute } from './types';

interface TickListProps {
    ticks: TicksByDate[];
    strapiUrl: string;
    totalRoutes: number;
    filteredRoutes: number;
    isFiltered: boolean;
}

interface LightboxState {
    isOpen: boolean;
    photos: Array<{ thumb: string; full: string; alt: string }>;
    currentIndex: number;
}

function resolveUrl(url: string, strapiUrl: string): string {
    return url.startsWith('http') ? url : strapiUrl + url;
}

function Lightbox({
    state,
    onClose,
    onPrev,
    onNext,
}: {
    state: LightboxState;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    useEffect(() => {
        if (!state.isOpen) return;
        document.body.style.overflow = 'hidden';

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
        };
        document.addEventListener('keydown', handleKey);

        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKey);
        };
    }, [state.isOpen, onClose, onPrev, onNext]);

    if (!state.isOpen) return null;

    const photo = state.photos[state.currentIndex];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <button
                type="button"
                className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-70 transition z-10"
                aria-label="Close"
                onClick={onClose}
            >
                &times;
            </button>
            {state.currentIndex > 0 && (
                <button
                    type="button"
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:opacity-70 transition z-10"
                    aria-label="Previous photo"
                    onClick={onPrev}
                >
                    &#8249;
                </button>
            )}
            {state.currentIndex < state.photos.length - 1 && (
                <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:opacity-70 transition z-10"
                    aria-label="Next photo"
                    onClick={onNext}
                >
                    &#8250;
                </button>
            )}
            <img
                src={photo.full}
                alt={photo.alt}
                className="max-h-[90vh] max-w-[90vw] object-contain"
            />
        </div>
    );
}

function RouteCard({
    route,
    strapiUrl,
    onPhotoClick,
}: {
    route: GroupedRoute;
    strapiUrl: string;
    onPhotoClick: (photos: LightboxState['photos'], index: number) => void;
}) {
    const photos = (route.photos || []).slice(0, 4).map(photo => ({
        thumb: resolveUrl(
            photo.formats?.thumbnail?.url || photo.formats?.small?.url || photo.url,
            strapiUrl,
        ),
        full: resolveUrl(
            photo.formats?.large?.url || photo.url,
            strapiUrl,
        ),
        alt: 'Climbing photo',
    }));

    return (
        <div className="tick-item flex items-start gap-4 p-3 rounded-lg border border-[var(--color-accent)]/30 hover:border-[var(--color-header)] transition">
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <a
                        href={route.route?.mountainProjectUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold hover:underline text-[var(--color-header)]"
                    >
                        {route.route?.name || 'Unknown Route'}
                    </a>
                    {route.route?.rating && (
                        <span className="text-sm font-mono">{route.route.rating}</span>
                    )}
                    {route.route?.routeType && (
                        <span className="text-xs opacity-70">{route.route.routeType}</span>
                    )}
                    {route.style && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent)]/20">
                            {route.style}{route.leadStyle ? ` \u00b7 ${route.leadStyle}` : ''}
                        </span>
                    )}
                    {route.pitches && route.pitches > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-header)]/20 font-semibold">
                            {route.pitches}p
                        </span>
                    )}
                </div>
                {route.route?.location && (
                    <p className="text-sm truncate opacity-80">{route.route.location}</p>
                )}
                {route.climbers.length > 0 && (
                    <p className="text-xs mt-1 opacity-70">{route.climbers.join(' & ')}</p>
                )}
                {route.notes.length > 0 && (
                    <p className="text-sm mt-2 italic opacity-80">{route.notes.join(' \u00b7 ')}</p>
                )}
                {photos.length > 0 && (
                    <div className="photo-gallery flex gap-2 mt-2 flex-wrap">
                        {photos.map((photo, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className="flex-shrink-0 cursor-pointer border-0 p-0 bg-transparent"
                                onClick={() => onPhotoClick(photos, idx)}
                            >
                                <img
                                    src={photo.thumb}
                                    alt={photo.alt}
                                    className="h-16 w-16 object-cover rounded hover:opacity-80 transition"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {route.bestStars > 0 && (
                <div
                    className="flex-shrink-0 text-sm text-[var(--color-header)]"
                    title={`${route.bestStars} stars`}
                >
                    {'\u2605'.repeat(route.bestStars)}{'\u2606'.repeat(4 - route.bestStars)}
                </div>
            )}
        </div>
    );
}

export default function TickList({ ticks, strapiUrl, totalRoutes, filteredRoutes, isFiltered }: TickListProps) {
    const [lightbox, setLightbox] = useState<LightboxState>({
        isOpen: false,
        photos: [],
        currentIndex: 0,
    });

    const closeLightbox = useCallback(() => {
        setLightbox(prev => ({ ...prev, isOpen: false }));
    }, []);

    const prevPhoto = useCallback(() => {
        setLightbox(prev => ({
            ...prev,
            currentIndex: Math.max(0, prev.currentIndex - 1),
        }));
    }, []);

    const nextPhoto = useCallback(() => {
        setLightbox(prev => ({
            ...prev,
            currentIndex: Math.min(prev.photos.length - 1, prev.currentIndex + 1),
        }));
    }, []);

    const openLightbox = useCallback((photos: LightboxState['photos'], index: number) => {
        setLightbox({ isOpen: true, photos, currentIndex: index });
    }, []);

    const routeCountText = isFiltered
        ? `(${filteredRoutes} of ${totalRoutes} routes)`
        : `(${totalRoutes} routes)`;

    if (ticks.length === 0 && !isFiltered) {
        return (
            <div className="text-center py-16 opacity-60">
                <p className="text-lg mb-2">No climbs logged</p>
                <p className="text-sm">Try selecting a different period or person.</p>
            </div>
        );
    }

    return (
        <>
            <p className="text-sm opacity-70 mb-4">{routeCountText}</p>

            {ticks.length === 0 && isFiltered && (
                <div className="text-center py-16 opacity-60">
                    <p className="text-lg mb-2">No routes match your filters</p>
                </div>
            )}

            {ticks.map(({ date, formattedDate, routes }) => (
                <div key={date} className="tick-day mb-8">
                    <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-[var(--color-bg)] py-2 border-b border-[var(--color-accent)]/30">
                        {formattedDate}
                    </h3>
                    <div className="space-y-2">
                        {routes.map((route, idx) => (
                            <RouteCard
                                key={`${date}-${idx}`}
                                route={route}
                                strapiUrl={strapiUrl}
                                onPhotoClick={openLightbox}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <Lightbox
                state={lightbox}
                onClose={closeLightbox}
                onPrev={prevPhoto}
                onNext={nextPhoto}
            />
        </>
    );
}
