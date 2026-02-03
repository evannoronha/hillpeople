import { useState, useEffect } from 'react';
import GradePyramid from './GradePyramid';
import BarChart from './BarChart';
import DonutChart from './DonutChart';

interface GradeData {
    grade: string;
    count: number;
}

interface GradePyramidData {
    all: GradeData[];
    leads: GradeData[];
    redpoints: GradeData[];
}

interface ActivityData {
    label: string;
    climbs: number;
    pitches: number;
}

interface RouteTypeData {
    label: string;
    value: number;
}

interface ChartsData {
    activityData: ActivityData[];
    routeTypeData: RouteTypeData[];
    gradePyramidData: GradePyramidData;
    showAllTime: boolean;
    showLast12Months: boolean;
    selectedYear?: number;
}

export default function ChartsIsland() {
    const [data, setData] = useState<ChartsData | null>(null);

    useEffect(() => {
        // Check if data was already loaded before this component mounted
        const existingData = (window as unknown as { __CHARTS_DATA__?: ChartsData }).__CHARTS_DATA__;
        if (existingData) {
            setData(existingData);
        }

        // Listen for data updates from the ticklist loader
        const handleChartsData = (event: CustomEvent<ChartsData>) => {
            setData(event.detail);
        };

        window.addEventListener('charts-data-update', handleChartsData as EventListener);

        return () => {
            window.removeEventListener('charts-data-update', handleChartsData as EventListener);
        };
    }, []);

    if (!data) {
        return null; // Skeleton is shown by the Astro page until data loads
    }

    const barChartTitle = data.showAllTime
        ? 'All-Time Activity'
        : data.showLast12Months
          ? 'Monthly Activity'
          : `${data.selectedYear} Activity`;

    return (
        <>
            {/* Charts Row */}
            <div className="charts-section grid md:grid-cols-2 gap-8 mb-12">
                <BarChart data={data.activityData} title={barChartTitle} />
                <DonutChart data={data.routeTypeData} title="Route Types" />
            </div>

            {/* Grade Pyramid */}
            <div className="chart-card bg-[var(--color-accent)]/5 rounded-xl p-6 mb-12">
                <GradePyramid data={data.gradePyramidData} />
            </div>
        </>
    );
}
