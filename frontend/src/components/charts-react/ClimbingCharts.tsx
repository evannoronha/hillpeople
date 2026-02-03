import React from 'react';
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

interface Props {
    activityData: ActivityData[];
    routeTypeData: RouteTypeData[];
    gradePyramidData: GradePyramidData;
    showAllTime: boolean;
    showLast12Months: boolean;
    selectedYear?: number;
}

export default function ClimbingCharts({
    activityData,
    routeTypeData,
    gradePyramidData,
    showAllTime,
    showLast12Months,
    selectedYear,
}: Props) {
    const barChartTitle = showAllTime
        ? 'All-Time Activity'
        : showLast12Months
          ? 'Monthly Activity'
          : `${selectedYear} Activity`;

    return (
        <>
            {/* Charts Row */}
            <div className="charts-section grid md:grid-cols-2 gap-8 mb-12">
                <BarChart data={activityData} title={barChartTitle} />
                <DonutChart data={routeTypeData} title="Route Types" />
            </div>

            {/* Grade Pyramid */}
            <div className="chart-card bg-[var(--color-accent)]/5 rounded-xl p-6 mb-12">
                <GradePyramid data={gradePyramidData} />
            </div>
        </>
    );
}

// Export individual components for flexibility
export { GradePyramid, BarChart, DonutChart };
