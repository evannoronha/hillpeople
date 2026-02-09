import { useState, useEffect, useMemo } from 'react';
import type { TicksByDate, TicklistFilters } from './types';
import { DEFAULT_FILTERS } from './types';
import { applyFilters, isDefaultFilters } from './filterTicks';
import TicklistFilterBar from './TicklistFilterBar';
import TickList from './TickList';

interface TicklistData {
    ticks: TicksByDate[];
    strapiUrl: string;
}

export default function TicklistIsland() {
    const [data, setData] = useState<TicklistData | null>(null);
    const [filters, setFilters] = useState<TicklistFilters>(DEFAULT_FILTERS);

    useEffect(() => {
        // Check if data was already loaded before this component mounted
        const existing = (window as unknown as { __TICKLIST_DATA__?: TicklistData }).__TICKLIST_DATA__;
        if (existing) {
            setData(existing);
        }

        // Listen for data updates from ticklist-loader.ts
        const handleData = (event: CustomEvent<TicklistData>) => {
            setData(event.detail);
        };

        window.addEventListener('ticklist-data-update', handleData as EventListener);

        return () => {
            window.removeEventListener('ticklist-data-update', handleData as EventListener);
        };
    }, []);

    const totalRoutes = useMemo(() => {
        if (!data) return 0;
        return data.ticks.reduce((sum, day) => sum + day.routes.length, 0);
    }, [data]);

    const filteredTicks = useMemo(() => {
        if (!data) return [];
        return applyFilters(data.ticks, filters);
    }, [data, filters]);

    const filteredRoutes = useMemo(() => {
        return filteredTicks.reduce((sum, day) => sum + day.routes.length, 0);
    }, [filteredTicks]);

    const isFiltered = !isDefaultFilters(filters);

    if (!data) return null;

    return (
        <>
            <TicklistFilterBar
                filters={filters}
                onChange={setFilters}
                ticks={data.ticks}
            />
            <TickList
                ticks={filteredTicks}
                strapiUrl={data.strapiUrl}
                totalRoutes={totalRoutes}
                filteredRoutes={filteredRoutes}
                isFiltered={isFiltered}
            />
        </>
    );
}
